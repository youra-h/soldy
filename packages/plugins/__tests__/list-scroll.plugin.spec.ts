// @vitest-environment jsdom

/**
 * Прокрутка списка — `TListScrollPlugin` на наборах ListBox, Select и меню:
 * одно правило на все списки.
 *
 * Список докручивает к элементу ровно за двумя фактами, откуда бы они ни
 * пришли. **Значение** — клик по строке, Enter, значение снаружи и
 * монтирование — двигает только сам список: виден целиком — ничего, частью —
 * ближайшим краем, не виден — в середину; `scrollIntoView`, который двигал бы
 * и страницу, не зовётся. **Подсветка** — стрелки, отметка на месте позиции,
 * наведение и открытие меню с клавиатуры — ближайшим краем через
 * `scrollIntoView`, как фокус. Позиция без отметки (Tab со строки) список не
 * двигает, а подсветку, снятую до кадра, он не догоняет.
 *
 * Раскладки в jsdom нет — коробки задаёт тест: окно списка высотой `ROWS`
 * строк от верха документа, элемент — на своём месте с поправкой на прокрутку
 * списка, а `scrollTo` списка двигает её. Окно (`Virtual`) рисует только
 * первые элементы до замера: цель вне его плагин закрепляет и ждёт её набор.
 *
 * Режимы движения — `motion.spec.ts`, в браузере —
 * `playground/vue/browser/list-scroll.spec.ts`,
 * `playground/vue/browser/list-box-virtual.spec.ts` и
 * `playground/vue/browser/select-virtual.spec.ts`.
 */

import { describe, it, expect, afterEach, vi } from 'vitest'
import {
	TListBox,
	TListBoxCollectionFacade,
	TMenu,
	TMenuCheckboxItem,
	TSelect,
	TSelectCollectionFacade,
	TWindowStrategy,
	createEngineMenu,
	listOf,
	menuOf,
	selectOf,
} from '@soldy-ui/core'
import type { IListBoxItem, TScrollBehavior } from '@soldy-ui/core'
import {
	TCollectionBundlesPlugin,
	TCollectionElements,
	TDismissPlugin,
	TElementPlugin,
	TListItemPlugin,
	TListKeyboardPlugin,
	TListScrollPlugin,
	TMenuHoverPlugin,
	TMenuKeyboardPlugin,
	TPluginBundle,
	TSelectKeyboardPlugin,
} from '../src'
import type { IPlugin, IPluginConstructor } from '../src'

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

/** Шаг строк и высота окна списка в строках. */
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

/** Прокрутка к подсвеченному — `scrollIntoView` узла элемента: чей узел и с чем. */
type TIntoView = { value: unknown; options: boolean | ScrollIntoViewOptions | undefined }

/**
 * Прокрутка списка без раскладки: окно — `ROWS` строк от верха документа,
 * содержимое — `count` строк. `scrollTop` — своё поле, и `scrollTo` его
 * двигает, как браузер, — коробки элементов едут вслед.
 */
function scrollable(list: HTMLElement, count: number) {
	let scrollTop = 0
	const scrollTo = vi.fn((options: ScrollToOptions) => {
		scrollTop = options.top ?? scrollTop
	})

	list.style.overflowY = 'auto'
	list.getBoundingClientRect = () =>
		DOMRect.fromRect({ x: 0, y: 0, width: 200, height: ROWS * STEP })
	Object.defineProperties(list, {
		clientHeight: { value: ROWS * STEP },
		scrollHeight: { value: count * STEP },
		scrollTop: {
			get: () => scrollTop,
			set: (value: number) => {
				scrollTop = value
			},
		},
		scrollTo: { value: scrollTo },
	})

	return scrollTo
}

/** Прокрутки списка: куда и как, по порядку. */
const scrolls = (scrollTo: ReturnType<typeof scrollable>) =>
	scrollTo.mock.calls.map(([options]) => options)

/**
 * Узел элемента на месте `place` списка — со строкой внутри, как в разметке:
 * коробка от верха окна с поправкой на прокрутку списка. `scrollIntoView`
 * узла пишет вызов в `intoView`.
 */
function itemNode(
	list: HTMLElement,
	parent: HTMLElement,
	place: number,
	intoView: TIntoView[],
	value: unknown,
): HTMLElement {
	const node = parent.appendChild(document.createElement('div'))
	const row = node.appendChild(document.createElement('div'))

	row.tabIndex = -1
	node.getBoundingClientRect = () =>
		DOMRect.fromRect({ x: 0, y: place * STEP - list.scrollTop, width: 200, height: STEP })
	node.scrollIntoView = (options) => {
		intoView.push({ value, options })
	}

	return node
}

/** Смонтировать элемент, как адаптер: набор с узлом и подсветкой — в реестр. */
function mountItem(registry: TCollectionBundlesPlugin, item: object, node: Element): void {
	const bundle = new TPluginBundle(item).use(TElementPlugin).use(TListItemPlugin)

	bundles.push(bundle)
	registry.register(bundle, item)
	pluginOf(bundle, TElementPlugin).element = node
}

/** Нажатие клавиши, как его шлёт браузер: всплывает и отменяется. */
const keydown = (target: Element, key: string) =>
	target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))

/** Узел строки; нет его — тест падает здесь, а не на вызове метода. */
function htmlOf(node: Element | null | undefined): HTMLElement {
	if (!(node instanceof HTMLElement)) throw new Error('строки нет')

	return node
}

type TListBoxOptions = {
	value?: string
	scrollBehavior?: TScrollBehavior
	/** Насколько список прокручен до монтирования, в строках. */
	scrolled?: number
	count?: number
	/** Места выключенных элементов. */
	disabled?: readonly number[]
}

/**
 * ListBox из `count` элементов, как его ставит дескриптор: клавиатура, за ней
 * прокрутка с её навигацией. Узел списка с ролью `listbox` в корне — то, что
 * прокручивается; клавиши — с него. Прокрутка мгновенная, если не задана.
 */
async function mountListBox({
	value,
	scrollBehavior = 'instant',
	scrolled = 0,
	count = 40,
	disabled = [],
}: TListBoxOptions = {}) {
	const owner = new TListBox({ value, scrollBehavior })
	const facade = new TListBoxCollectionFacade(
		{
			items: Array.from({ length: count }, (_, place) => ({
				value: `v${place + 1}`,
				disabled: disabled.includes(place),
			})),
		},
		{ owner },
	)
	const engine = facade.engine
	const items = engine.extensions.batch.items
	const root = document.body.appendChild(document.createElement('div'))
	const list = root.appendChild(document.createElement('div'))
	const scrollTo = scrollable(list, count)
	const intoView: TIntoView[] = []

	list.setAttribute('role', 'listbox')
	list.tabIndex = 0
	list.scrollTop = scrolled * STEP

	const bundle = new TPluginBundle(owner)
		.use(TElementPlugin)
		.use(TCollectionBundlesPlugin)
		.use(TCollectionElements)
		.use(TListKeyboardPlugin)
		.use(TListScrollPlugin, { navigation: TListKeyboardPlugin })

	bundles.push(bundle)

	const registry = pluginOf(bundle, TCollectionBundlesPlugin)
	const rows = items.map((item, place) => {
		const node = itemNode(list, list, place, intoView, item.value)

		mountItem(registry, item, node)

		return htmlOf(node.firstElementChild)
	})

	registry.bindEngine(engine)
	pluginOf(bundle, TElementPlugin).element = root
	await nextFrame()

	return {
		owner,
		engine,
		items,
		list,
		rows,
		scrollTo,
		intoView,
		press: (key: string, target: Element = list) => keydown(target, key),
	}
}

type TListBoxSet = Awaited<ReturnType<typeof mountListBox>>

/**
 * Значение элементу на месте `place` — разными путями. Список прокручен на
 * `scrolled` строк к моменту, когда значение пришло.
 */
const VALUE_SOURCES: ReadonlyArray<
	[string, (place: number, scrolled: number) => Promise<TListBoxSet>]
> = [
	['монтирование', (place, scrolled) => mountListBox({ value: `v${place + 1}`, scrolled })],
	[
		'значение снаружи',
		async (place, scrolled) => {
			const set = await mountListBox({ scrolled })

			set.owner.value = `v${place + 1}`
			await nextFrame()

			return set
		},
	],
	[
		'клик по строке',
		async (place, scrolled) => {
			const set = await mountListBox({ scrolled })

			listOf<IListBoxItem>(set.engine)?.chooseItem(set.items[place])
			await nextFrame()

			return set
		},
	],
	[
		'Enter',
		async (place, scrolled) => {
			const set = await mountListBox()

			for (let step = 0; step <= place; step++) set.press('ArrowDown')
			await nextFrame()

			// Подсвеченный листнули колесом: к нему прокрутка была — за подсветкой
			set.list.scrollTop = scrolled * STEP
			set.scrollTo.mockClear()
			set.intoView.length = 0
			set.press('Enter')
			await nextFrame()

			return set
		},
	],
]

describe('значение — одно правило, откуда бы оно ни пришло', () => {
	it.each(VALUE_SOURCES)('%s: виден целиком — прокрутки нет', async (_name, apply) => {
		const set = await apply(3, 0)

		expect(set.owner.value).toBe('v4')
		expect(set.scrollTo).not.toHaveBeenCalled()
		expect(set.intoView).toEqual([])
	})

	it.each(VALUE_SOURCES)(
		'%s: срезан нижним краем — встаёт целиком у нижнего края',
		async (_name, apply) => {
			const set = await apply(10, 0.5)

			// Строка 10 стоит на 285–315 при окне 0–300: доводка — на 15
			expect(scrolls(set.scrollTo)).toEqual([{ top: STEP, behavior: 'instant' }])
			expect(set.intoView).toEqual([])
		},
	)

	it.each(VALUE_SOURCES)(
		'%s: срезан верхним краем — встаёт целиком у верхнего края',
		async (_name, apply) => {
			const set = await apply(10, 10.5)

			// Строка 10 стоит на −15–15: доводка — назад на 15
			expect(scrolls(set.scrollTo)).toEqual([{ top: 10 * STEP, behavior: 'instant' }])
			expect(set.intoView).toEqual([])
		},
	)

	it.each(VALUE_SOURCES)('%s: не виден — в середину окна', async (_name, apply) => {
		const set = await apply(30, 0)

		// Середина строки 30 — 915, середина окна — 150
		expect(scrolls(set.scrollTo)).toEqual([
			{ top: 30 * STEP + STEP / 2 - (ROWS * STEP) / 2, behavior: 'instant' },
		])
		expect(set.intoView).toEqual([])
	})

	it('монтирование — сразу и при smooth: анимировать не от чего', async () => {
		const { scrollTo } = await mountListBox({ value: 'v31', scrollBehavior: 'smooth' })

		expect(scrolls(scrollTo)).toEqual([expect.objectContaining({ behavior: 'instant' })])
	})

	it('снятие выбора не крутит', async () => {
		const { engine, items, scrollTo } = await mountListBox({ value: 'v31' })

		scrollTo.mockClear()
		engine.extensions.selection.deselect(items[30])
		await nextFrame()

		expect(scrollTo).not.toHaveBeenCalled()
	})
})

describe('подсветка — ближайшим краем, как фокус', () => {
	it('стрелка — scrollIntoView подсвеченного, одна на кадр; список сам не крутится', async () => {
		const { press, scrollTo, intoView } = await mountListBox()

		press('ArrowDown')
		press('ArrowDown')

		// Прокрутка — в следующем кадре, к последней подсветке
		expect(intoView).toEqual([])

		await nextFrame()

		expect(intoView).toEqual([
			{ value: 'v2', options: { block: 'nearest', behavior: 'instant' } },
		])
		expect(scrollTo).not.toHaveBeenCalled()
	})

	/**
	 * Позиция стоит на выбранном без отметки, а доступный элемент один: шаг по
	 * кругу приводит к нему же, и отметка встаёт на месте. Это видимая
	 * подсветка — список докручивает к ней, хоть позиция и не сменилась.
	 */
	it('отметка на единственном доступном — прокрутка к нему', async () => {
		const { press, intoView } = await mountListBox({
			value: 'v2',
			count: 3,
			disabled: [0, 2],
		})

		press('ArrowDown')
		await nextFrame()

		expect(intoView).toEqual([
			{ value: 'v2', options: { block: 'nearest', behavior: 'instant' } },
		])
	})

	/**
	 * Клавиша со строки ставит позицию на её элемент без отметки. Tab с неё
	 * уводит из списка: подсветки на экране нет, и докручивать не к чему.
	 */
	it('Tab со строки — прокрутки нет', async () => {
		const { press, rows, scrollTo, intoView } = await mountListBox()

		press('ArrowDown')
		await nextFrame()
		intoView.length = 0

		rows[30].focus()
		press('Tab', rows[30])
		await nextFrame()

		expect(intoView).toEqual([])
		expect(scrollTo).not.toHaveBeenCalled()
	})

	it('подсветку сняли до кадра — прокрутки нет', async () => {
		const { press, rows, scrollTo, intoView } = await mountListBox()

		press('ArrowDown')
		// Позиция ушла на строку без отметки — видимая подсветка снята
		rows[30].focus()
		press('Tab', rows[30])
		await nextFrame()

		expect(intoView).toEqual([])
		expect(scrollTo).not.toHaveBeenCalled()
	})

	it('none — ни подсветка, ни значение список не двигают', async () => {
		const { owner, press, scrollTo, intoView } = await mountListBox({
			value: 'v31',
			scrollBehavior: 'none',
		})

		press('ArrowDown')
		owner.value = 'v35'
		await nextFrame()

		expect(scrollTo).not.toHaveBeenCalled()
		expect(intoView).toEqual([])
	})
})

/**
 * Select — тот же плагин, навигация — клавиатура комбобокса. Опции — в списке
 * панели, телепортированном в `body`; клавиши — с поля. Панель после выбора
 * открыта (`closeOnSelect: false`): закрытая скрыта, и её список не
 * прокручивается, а раскладки, которая это покажет, в jsdom нет.
 */
async function mountSelect({ value, count = 40 }: { value?: string; count?: number } = {}) {
	const owner = new TSelect({ value, scrollBehavior: 'instant', closeOnSelect: false })
	const facade = new TSelectCollectionFacade(
		{ items: Array.from({ length: count }, (_, place) => ({ value: `v${place + 1}` })) },
		{ owner },
	)
	const engine = facade.engine
	const items = engine.extensions.batch.items
	const root = document.body.appendChild(document.createElement('div'))
	const input = root.appendChild(document.createElement('input'))
	const list = document.body.appendChild(document.createElement('div'))
	const scrollTo = scrollable(list, count)
	const intoView: TIntoView[] = []

	list.setAttribute('role', 'listbox')

	const bundle = new TPluginBundle(owner)
		.use(TElementPlugin)
		.use(TCollectionBundlesPlugin)
		.use(TCollectionElements)
		.use(TSelectKeyboardPlugin)
		.use(TListScrollPlugin, { navigation: TSelectKeyboardPlugin })

	bundles.push(bundle)

	const registry = pluginOf(bundle, TCollectionBundlesPlugin)

	items.forEach((item, place) => {
		mountItem(registry, item, itemNode(list, list, place, intoView, item.value))
	})

	registry.bindEngine(engine)
	pluginOf(bundle, TElementPlugin).element = root
	await nextFrame()

	return {
		owner,
		engine,
		items,
		list,
		scrollTo,
		intoView,
		press: (key: string) => keydown(input, key),
	}
}

describe('Select', () => {
	it('монтирование — дальний выбранный в середину', async () => {
		const { scrollTo, intoView } = await mountSelect({ value: 'v31' })

		expect(scrolls(scrollTo)).toEqual([
			{ top: 30 * STEP + STEP / 2 - (ROWS * STEP) / 2, behavior: 'instant' },
		])
		expect(intoView).toEqual([])
	})

	it('клик по опции и значение снаружи — по правилу значения', async () => {
		const { owner, engine, items, list, scrollTo, intoView } = await mountSelect()

		list.scrollTop = STEP / 2
		selectOf(engine)?.chooseItem(items[10])
		await nextFrame()

		// Срезана нижним краем — ближайшим краем
		expect(scrolls(scrollTo)).toEqual([{ top: STEP, behavior: 'instant' }])

		scrollTo.mockClear()
		owner.value = 'v4'
		await nextFrame()

		// Видна целиком — прокрутки нет
		expect(scrollTo).not.toHaveBeenCalled()
		expect(intoView).toEqual([])
	})

	it('стрелка открывает на первой опции — scrollIntoView к ней', async () => {
		const { owner, press, scrollTo, intoView } = await mountSelect()

		press('ArrowDown')
		await nextFrame()

		expect(owner.open).toBe(true)
		expect(intoView).toEqual([
			{ value: 'v1', options: { block: 'nearest', behavior: 'instant' } },
		])
		expect(scrollTo).not.toHaveBeenCalled()
	})

	it('Escape до кадра — подсветка снята, прокрутки нет', async () => {
		const { press, intoView } = await mountSelect()

		press('ArrowDown')
		press('Escape')
		await nextFrame()

		expect(intoView).toEqual([])
	})
})

/**
 * Меню — тот же плагин, навигация — клавиатура меню. Пункты — флажки: их
 * отметка — значение меню. Прокручивается список пунктов внутри панели с
 * ролью `menu`, а не панель. У меню нет `scrollBehavior` — действует
 * умолчание списков, `smooth`: в jsdom режим движения его не убирает.
 */
async function mountMenu({ count = 30, checked }: { count?: number; checked?: number } = {}) {
	const owner = new TMenu()
	const engine = createEngineMenu({ owner })
	const items = Array.from({ length: count }, (_, place) =>
		engine.extensions.plain.push(new TMenuCheckboxItem({ value: `m${place + 1}` })),
	)

	if (checked !== undefined) engine.extensions.selection.select(items[checked])

	const root = document.body.appendChild(document.createElement('span'))
	const trigger = root.appendChild(document.createElement('button'))
	const panel = document.body.appendChild(document.createElement('div'))
	const list = panel.appendChild(document.createElement('div'))
	const scrollTo = scrollable(list, count)
	const panelScrollTo = vi.fn()
	const intoView: TIntoView[] = []

	panel.setAttribute('role', 'menu')
	panel.tabIndex = -1
	Object.defineProperty(panel, 'scrollTo', { value: panelScrollTo })

	const bundle = new TPluginBundle(owner)
		.use(TElementPlugin)
		.use(TCollectionBundlesPlugin)
		.use(TCollectionElements)
		.use(TDismissPlugin, { focusOutside: true })
		.use(TMenuKeyboardPlugin)
		.use(TListScrollPlugin, { navigation: TMenuKeyboardPlugin })
		.use(TMenuHoverPlugin)

	bundles.push(bundle)

	for (const [name, value] of Object.entries(pluginOf(bundle, TDismissPlugin).ownerAttribute)) {
		panel.setAttribute(name, value)
	}

	const registry = pluginOf(bundle, TCollectionBundlesPlugin)
	const rows = items.map((item, place) => {
		const node = itemNode(list, list, place, intoView, item.value)

		mountItem(registry, item, node)

		return htmlOf(node.firstElementChild)
	})

	registry.bindEngine(engine)
	pluginOf(bundle, TElementPlugin).element = root
	await nextFrame()

	return { owner, engine, items, trigger, rows, scrollTo, panelScrollTo, intoView }
}

describe('меню', () => {
	it('открыто ↑ — к последнему пункту ближайшим краем; фокус строке — без прокрутки', async () => {
		const { trigger, rows, scrollTo, intoView } = await mountMenu()
		const focus = vi.spyOn(rows[29], 'focus')

		keydown(trigger, 'ArrowUp')
		await nextFrame()

		expect(focus).toHaveBeenCalledWith({ preventScroll: true })
		expect(intoView).toEqual([
			{ value: 'm30', options: { block: 'nearest', behavior: 'smooth' } },
		])
		expect(scrollTo).not.toHaveBeenCalled()
	})

	it('наведение на пункт — прокрутка к нему, как от клавиш', async () => {
		const { owner, rows, intoView } = await mountMenu()

		owner.open = true
		rows[9].dispatchEvent(
			new PointerEvent('pointermove', { bubbles: true, pointerType: 'mouse' }),
		)
		await nextFrame()

		expect(intoView).toEqual([
			{ value: 'm10', options: { block: 'nearest', behavior: 'smooth' } },
		])
	})

	it('отметка флажка — значение: крутится список пунктов, а не панель', async () => {
		const { owner, engine, items, scrollTo, panelScrollTo, intoView } = await mountMenu()

		owner.open = true
		menuOf(engine)?.checkItem(items[20])
		await nextFrame()

		expect(scrolls(scrollTo)).toEqual([
			{ top: 20 * STEP + STEP / 2 - (ROWS * STEP) / 2, behavior: 'smooth' },
		])
		expect(panelScrollTo).not.toHaveBeenCalled()
		expect(intoView).toEqual([])
	})

	it('монтирование — к отмеченному, сразу', async () => {
		const { scrollTo } = await mountMenu({ checked: 25 })

		expect(scrolls(scrollTo)).toEqual([
			{ top: 25 * STEP + STEP / 2 - (ROWS * STEP) / 2, behavior: 'instant' },
		])
	})

	it('закрытие до кадра — подсветка снята, прокрутки нет', async () => {
		const { owner, trigger, intoView } = await mountMenu()

		keydown(trigger, 'ArrowUp')
		owner.open = false
		await nextFrame()

		expect(intoView).toEqual([])
	})
})

/**
 * Элементы в группах (`ListBox.Group`): родитель элемента — группа, а
 * прокручивается список вокруг групп.
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
		const scrollTo = scrollable(list, 40)
		const groupScrollTo = vi.fn()
		const groups = new Map<unknown, HTMLElement>()

		list.setAttribute('role', 'listbox')

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

			mountItem(registry, item, itemNode(list, group, place, [], item.value))
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
 * Навигации в наборе нет — прокрутка идёт только за значением.
 */
describe('прокрутка за выбором в multiple', () => {
	/** Список из 40 элементов с выбранными `value`, прокрученный к началу. */
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
		const scrollTo = scrollable(list, 40)

		list.setAttribute('role', 'listbox')

		const bundle = new TPluginBundle(owner)
			.use(TElementPlugin)
			.use(TCollectionBundlesPlugin)
			.use(TCollectionElements)
			.use(TListScrollPlugin)

		bundles.push(bundle)

		const registry = pluginOf(bundle, TCollectionBundlesPlugin)

		registry.bindEngine(engine)

		engine.extensions.batch.items.forEach((item, place) => {
			mountItem(registry, item, itemNode(list, list, place, [], item.value))
		})

		pluginOf(bundle, TElementPlugin).element = root
		await nextFrame()
		// Начальная прокрутка увела список к выбранному — листаем к началу
		list.scrollTop = 0
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
			expect.objectContaining({ top: 30 * STEP + STEP / 2 - (ROWS * STEP) / 2 }),
		)
	})

	it('выбор видимого элемента не уводит список к первому выбранному', async () => {
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

/**
 * Список в окне (обёртка `Virtual`): до первого замера окно рисует только
 * первые элементы, и выбранного дальше них в документе нет. Прокрутка
 * закрепляет его своей причиной — окно дорисует его после замера, — ждёт,
 * когда набор выбранного зарегистрируют, и прокручивает кадром позже: узел
 * адаптер привязывает после регистрации.
 *
 * Навигации в наборе нет — прокрутка идёт только за значением, и других
 * закреплений, кроме её собственного, у окна нет.
 */
async function mountWindow(scrollBehavior: TScrollBehavior = 'smooth') {
	const owner = new TListBox({ value: 'v151', scrollBehavior })
	const facade = new TListBoxCollectionFacade(
		{ items: Array.from({ length: 200 }, (_, index) => ({ value: `v${index + 1}` })) },
		{ owner },
	)
	const engine = facade.engine
	const draw = engine.extensions.draw
	const items = engine.extensions.batch.items

	draw.useStrategy(new TWindowStrategy())

	const root = document.body.appendChild(document.createElement('div'))
	const list = root.appendChild(document.createElement('div'))
	const scrollTo = scrollable(list, 200)

	list.setAttribute('role', 'listbox')

	const bundle = new TPluginBundle(owner)
		.use(TElementPlugin)
		.use(TCollectionBundlesPlugin)
		.use(TCollectionElements)
		.use(TListScrollPlugin)

	bundles.push(bundle)

	const registry = pluginOf(bundle, TCollectionBundlesPlugin)

	/** Смонтировать элемент, как адаптер: набор — в реестр, узел — следом. */
	const mount = (item: IListBoxItem): void => {
		mountItem(registry, item, itemNode(list, list, items.indexOf(item), [], item.value))
	}

	registry.bindEngine(engine)

	for (const entry of draw.drawn) {
		if (entry.kind === 'item') mount(entry.item)
	}

	pluginOf(bundle, TElementPlugin).element = root
	await nextFrame()

	return {
		owner,
		engine,
		items,
		bundle,
		scrollTo,
		mount,
		/** Нарисовано ли окном: элемент среди записей `drawn`. */
		drawn: (item: IListBoxItem) =>
			draw.drawn.some((entry) => entry.kind === 'item' && entry.item === item),
		/** Замер окна у верха списка. */
		measure: () => draw.notifyViewport({ top: 0, bottom: ROWS * STEP, step: STEP }),
	}
}

describe('цели нет в документе — окно её не нарисовало', () => {
	it('до замера её нет среди нарисованных, прокрутки нет; замер дорисует её — она закреплена', async () => {
		const { items, drawn, measure, scrollTo } = await mountWindow()

		expect(drawn(items[150])).toBe(false)
		expect(scrollTo).not.toHaveBeenCalled()

		measure()

		expect(drawn(items[150])).toBe(true)
	})

	it('набор цели зарегистрировали — кадром позже она в середине окна, сразу и при smooth', async () => {
		const { items, mount, scrollTo } = await mountWindow()

		mount(items[150])

		// Узел адаптер привязывает после регистрации: прокрутка — в следующем кадре
		expect(scrollTo).not.toHaveBeenCalled()

		await nextFrame()

		expect(scrolls(scrollTo)).toEqual([
			{ top: 150 * STEP + STEP / 2 - (ROWS * STEP) / 2, behavior: 'instant' },
		])
	})

	/**
	 * Окно перемеряется кадром после прокрутки: без закрепления оно на этот
	 * кадр убрало бы цель, к которой только что прокрутили, — список мигнул бы
	 * распорками. Снимает закрепление следующая цель.
	 */
	it('закрепление держится после прокрутки и снимается следующей целью', async () => {
		const { owner, items, mount, measure, drawn } = await mountWindow()

		mount(items[150])
		await nextFrame()
		measure()

		expect(drawn(items[150])).toBe(true)

		owner.value = 'v2'

		expect(drawn(items[150])).toBe(false)
	})

	it('смонтировали другой элемент — прокрутки нет', async () => {
		const { items, mount, scrollTo } = await mountWindow()

		mount(items[100])
		await nextFrame()

		expect(scrollTo).not.toHaveBeenCalled()
	})

	it('выбор сменился до монтирования — прежнюю цель прокрутка не ждёт и не держит', async () => {
		const { owner, items, mount, measure, drawn, scrollTo } = await mountWindow()

		owner.value = 'v181'
		await nextFrame()
		measure()

		expect(drawn(items[150])).toBe(false)
		expect(drawn(items[180])).toBe(true)

		mount(items[150])
		await nextFrame()

		expect(scrollTo).not.toHaveBeenCalled()
	})

	it('значение сняли до монтирования — цель отменена', async () => {
		const { engine, items, mount, measure, drawn, scrollTo } = await mountWindow()

		engine.extensions.selection.deselect(items[150])
		measure()

		expect(drawn(items[150])).toBe(false)

		mount(items[150])
		await nextFrame()

		expect(scrollTo).not.toHaveBeenCalled()
	})

	it('none — не закрепляет и не прокручивает', async () => {
		const { items, mount, measure, drawn, scrollTo } = await mountWindow('none')

		measure()

		expect(drawn(items[150])).toBe(false)

		mount(items[150])
		await nextFrame()

		expect(scrollTo).not.toHaveBeenCalled()
	})

	it('плагин уничтожен до кадра — прокрутки нет, закрепление снято', async () => {
		const { bundle, items, mount, measure, drawn, scrollTo } = await mountWindow()

		mount(items[150])
		bundles.splice(bundles.indexOf(bundle), 1)
		bundle.destroy()
		await nextFrame()
		measure()

		expect(scrollTo).not.toHaveBeenCalled()
		expect(drawn(items[150])).toBe(false)
	})
})
