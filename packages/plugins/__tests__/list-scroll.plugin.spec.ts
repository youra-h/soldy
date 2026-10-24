// @vitest-environment jsdom

/**
 * Начальная прокрутка ListBox к выбранному в окне (обёртка `Virtual`). До
 * первого замера окно рисует только первые элементы, и выбранного дальше них
 * в документе нет: окно дорисует его после замера. Прокрутка ждёт, когда
 * набор выбранного зарегистрируют, и прокручивает кадром позже — узел адаптер
 * привязывает после регистрации.
 *
 * Без окна и по режимам движения — `motion.spec.ts`, в браузере —
 * `playground/vue/browser/list-box-virtual.spec.ts`.
 */

import { describe, it, expect, afterEach, vi } from 'vitest'
import { TListBox, TListBoxCollectionFacade, TWindowStrategy } from '@soldy-ui/core'
import type { IListBoxItem, TScrollBehavior } from '@soldy-ui/core'
import {
	TCollectionBundlesPlugin,
	TCollectionElements,
	TElementPlugin,
	TListScrollPlugin,
	TPluginBundle,
} from '../src'
import type { IPlugin, IPluginConstructor } from '../src'

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

/** Шаг элементов и высота окна списка в шагах. */
const STEP = 30
const ROWS = 10

/** Плагин, который тест поставил сам: без него дальше проверять нечего. */
function pluginOf<P extends IPlugin<any, any>>(
	bundle: TPluginBundle,
	ctor: IPluginConstructor<any, any, P>,
): P {
	const plugin = bundle.get(ctor)

	if (!plugin) throw new Error(`${ctor.name} не установлен в bundle`)

	return plugin
}

const bundles: TPluginBundle[] = []

afterEach(() => {
	for (const bundle of bundles.splice(0)) bundle.destroy()

	document.body.innerHTML = ''
})

/**
 * Список из 200 элементов в окне до замера, выбран 151-й. Порядок — как у
 * адаптера: движок привязан при сборке, нарисованные окном элементы
 * смонтированы, узел корня объявлен кадром позже. Раскладки в jsdom нет —
 * коробки задаёт тест: окно списка высотой `ROWS` шагов, элемент — на своём
 * месте от его верха.
 *
 * Разметка — как у ListBox: элементы — в узле списка с ролью `listbox` внутри
 * корня, и прокручивается он, а не корень (`rootScrollTo`): рядом с ним в
 * корне стоят шапка и подвал.
 */
async function setup(scrollBehavior: TScrollBehavior = 'smooth') {
	const owner = new TListBox({ value: 'v151', scrollBehavior })
	const facade = new TListBoxCollectionFacade(
		{
			items: Array.from({ length: 200 }, (_, index) => ({
				value: `v${index + 1}`,
				text: `Пункт ${index + 1}`,
			})),
		},
		{ owner },
	)
	const engine = facade.engine
	const draw = engine.extensions.draw
	const items = engine.extensions.batch.items

	draw.useStrategy(new TWindowStrategy())

	const root = document.body.appendChild(document.createElement('div'))
	const list = root.appendChild(document.createElement('div'))
	const scrollTo = vi.fn()
	const rootScrollTo = vi.fn()

	list.setAttribute('role', 'listbox')
	list.getBoundingClientRect = () =>
		DOMRect.fromRect({ x: 0, y: 0, width: 200, height: ROWS * STEP })
	Object.defineProperty(list, 'clientHeight', { value: ROWS * STEP })
	Object.defineProperty(list, 'scrollTo', { value: scrollTo })
	Object.defineProperty(root, 'scrollTo', { value: rootScrollTo })

	const bundle = new TPluginBundle(owner)
		.use(TElementPlugin)
		.use(TCollectionBundlesPlugin)
		.use(TCollectionElements)
		.use(TListScrollPlugin)

	bundles.push(bundle)

	const registry = pluginOf(bundle, TCollectionBundlesPlugin)

	/** Смонтировать элемент, как адаптер: набор — в реестр, узел — следом. */
	const mountItem = (item: IListBoxItem): void => {
		const itemBundle = new TPluginBundle(item).use(TElementPlugin)
		const node = list.appendChild(document.createElement('div'))
		const top = items.indexOf(item) * STEP

		node.getBoundingClientRect = () =>
			DOMRect.fromRect({ x: 0, y: top, width: 200, height: STEP })
		bundles.push(itemBundle)
		registry.register(itemBundle, item)
		pluginOf(itemBundle, TElementPlugin).element = node
	}

	registry.bindEngine(engine)

	for (const entry of draw.drawn) {
		if (entry.kind === 'item') mountItem(entry.item)
	}

	pluginOf(bundle, TElementPlugin).element = root
	await nextFrame()

	return { owner, items, drawn: draw.drawn, mountItem, scrollTo, rootScrollTo }
}

describe('выбранного окно ещё не нарисовало', () => {
	it('до первого замера выбранного нет среди нарисованных — прокрутки нет', async () => {
		const { items, drawn, scrollTo } = await setup()

		expect(drawn.some((entry) => entry.kind === 'item' && entry.item === items[150])).toBe(
			false,
		)
		expect(scrollTo).not.toHaveBeenCalled()
	})

	it('выбранный смонтировали — кадром позже он в середине окна, сразу и при smooth', async () => {
		const { items, mountItem, scrollTo, rootScrollTo } = await setup()

		mountItem(items[150])

		// Узел адаптер привязывает после регистрации: прокрутка — в следующем кадре
		expect(scrollTo).not.toHaveBeenCalled()

		await nextFrame()

		expect(scrollTo).toHaveBeenCalledOnce()
		expect(scrollTo).toHaveBeenCalledWith({
			top: 150 * STEP - (ROWS * STEP) / 2,
			behavior: 'instant',
		})
		// Прокручивается узел списка — родитель элементов, а не корень
		expect(rootScrollTo).not.toHaveBeenCalled()
	})

	it('смонтировали другой элемент — прокрутки нет', async () => {
		const { items, mountItem, scrollTo } = await setup()

		mountItem(items[100])
		await nextFrame()

		expect(scrollTo).not.toHaveBeenCalled()
	})

	it('выбор сменился до монтирования — прежний выбранный прокрутка не ждёт', async () => {
		const { owner, items, mountItem, scrollTo } = await setup()

		owner.value = 'v181'
		await nextFrame()
		mountItem(items[150])
		await nextFrame()

		expect(scrollTo).not.toHaveBeenCalled()
	})

	it('none — не прокручивает и смонтированный', async () => {
		const { items, mountItem, scrollTo } = await setup('none')

		mountItem(items[150])
		await nextFrame()

		expect(scrollTo).not.toHaveBeenCalled()
	})
})

/**
 * Элементы в группах (`ListBox.Group`): родитель элемента — группа, а
 * прокручивается список вокруг групп. Окна у списка с группами нет — все
 * элементы в документе.
 */
describe('элементы в группах', () => {
	it('прокручивается узел списка, а не группа элемента', async () => {
		const owner = new TListBox({ value: 'v40', scrollBehavior: 'smooth' })
		const facade = new TListBoxCollectionFacade(
			{
				items: Array.from({ length: 40 }, (_, index) => ({
					value: `v${index + 1}`,
					_: { group: index < 20 ? 'first' : 'second' },
				})),
			},
			{ owner },
		)
		const engine = facade.engine
		const root = document.body.appendChild(document.createElement('div'))
		const list = root.appendChild(document.createElement('div'))
		const scrollTo = vi.fn()
		const groupScrollTo = vi.fn()
		const groups = new Map<unknown, HTMLElement>()

		list.setAttribute('role', 'listbox')
		list.getBoundingClientRect = () =>
			DOMRect.fromRect({ x: 0, y: 0, width: 200, height: ROWS * STEP })
		Object.defineProperty(list, 'clientHeight', { value: ROWS * STEP })
		Object.defineProperty(list, 'scrollTo', { value: scrollTo })

		const bundle = new TPluginBundle(owner)
			.use(TElementPlugin)
			.use(TCollectionBundlesPlugin)
			.use(TCollectionElements)
			.use(TListScrollPlugin)

		bundles.push(bundle)

		const registry = pluginOf(bundle, TCollectionBundlesPlugin)

		registry.bindEngine(engine)

		engine.extensions.batch.shown.forEach((item, place) => {
			const key = engine.extensions.meta.get(item)?.group
			let group = groups.get(key)

			if (!group) {
				group = list.appendChild(document.createElement('div'))
				group.setAttribute('role', 'group')
				Object.defineProperty(group, 'scrollTo', { value: groupScrollTo })
				groups.set(key, group)
			}

			const itemBundle = new TPluginBundle(item).use(TElementPlugin)
			const node = group.appendChild(document.createElement('div'))

			node.getBoundingClientRect = () =>
				DOMRect.fromRect({ x: 0, y: place * STEP, width: 200, height: STEP })
			bundles.push(itemBundle)
			registry.register(itemBundle, item)
			pluginOf(itemBundle, TElementPlugin).element = node
		})

		pluginOf(bundle, TElementPlugin).element = root
		await nextFrame()

		expect(scrollTo).toHaveBeenCalledOnce()
		expect(groupScrollTo).not.toHaveBeenCalled()
	})
})

/**
 * Прокрутка за выбором — к элементу, который стал выбранным. В `multiple`
 * выбранных несколько, и первый из них — не тот, что выбрали сейчас: список
 * уезжал к первому выбранному, а при `smooth` — проходом через всё между ними.
 * Снятие выбора не крутит. Окна нет — все элементы в документе, а за краем
 * окна списка — элементы ниже `ROWS` шагов.
 */
describe('прокрутка за выбором в multiple', () => {
	/** Список из 40 элементов с выбранными `value`; начальная прокрутка уже прошла. */
	async function mountMultiple(value: string[]) {
		const owner = new TListBox({ value, scrollBehavior: 'smooth' })
		const facade = new TListBoxCollectionFacade(
			{
				mode: 'multiple',
				items: Array.from({ length: 40 }, (_, index) => ({ value: `v${index + 1}` })),
			},
			{ owner },
		)
		const engine = facade.engine
		const root = document.body.appendChild(document.createElement('div'))
		const list = root.appendChild(document.createElement('div'))
		const scrollTo = vi.fn()

		list.setAttribute('role', 'listbox')
		list.getBoundingClientRect = () =>
			DOMRect.fromRect({ x: 0, y: 0, width: 200, height: ROWS * STEP })
		Object.defineProperty(list, 'clientHeight', { value: ROWS * STEP })
		Object.defineProperty(list, 'scrollTo', { value: scrollTo })

		const bundle = new TPluginBundle(owner)
			.use(TElementPlugin)
			.use(TCollectionBundlesPlugin)
			.use(TCollectionElements)
			.use(TListScrollPlugin)

		bundles.push(bundle)

		const registry = pluginOf(bundle, TCollectionBundlesPlugin)

		registry.bindEngine(engine)

		engine.extensions.batch.items.forEach((item, place) => {
			const itemBundle = new TPluginBundle(item).use(TElementPlugin)
			const node = list.appendChild(document.createElement('div'))

			node.getBoundingClientRect = () =>
				DOMRect.fromRect({ x: 0, y: place * STEP, width: 200, height: STEP })
			bundles.push(itemBundle)
			registry.register(itemBundle, item)
			pluginOf(itemBundle, TElementPlugin).element = node
		})

		pluginOf(bundle, TElementPlugin).element = root
		await nextFrame()
		scrollTo.mockClear()

		return {
			selection: engine.extensions.selection,
			items: engine.extensions.batch.items,
			scrollTo,
		}
	}

	it('выбор крутит к новому выбранному, а не к первому', async () => {
		const { selection, items, scrollTo } = await mountMultiple(['v1'])

		selection.select(items[30])
		await nextFrame()

		expect(scrollTo).toHaveBeenCalledOnce()
		expect(scrollTo).toHaveBeenCalledWith(
			expect.objectContaining({ top: 30 * STEP - (ROWS * STEP) / 2 }),
		)
	})

	it('выбор видимого элемента не уводит список к первому выбранному', async () => {
		// Коробки за прокруткой не едут: первый выбранный остаётся за краем окна
		// списка, как после того, как список листнули к началу
		const { selection, items, scrollTo } = await mountMultiple(['v31'])

		selection.select(items[1])
		await nextFrame()

		expect(scrollTo).not.toHaveBeenCalled()
	})

	it('снятие выбора не крутит', async () => {
		const { selection, items, scrollTo } = await mountMultiple(['v1', 'v31'])

		selection.deselect(items[0])
		await nextFrame()

		expect(scrollTo).not.toHaveBeenCalled()
	})
})
