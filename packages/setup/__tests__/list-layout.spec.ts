// @vitest-environment jsdom

/**
 * Раскладка списка: четыре плагина вместо одного.
 *
 * `TListLayoutPlugin` держит свойства (`maxRows`, `wordWrap`, `autoWidth`,
 * `scrollBehavior`) и сообщает о смене событием. Следствия — за отдельными
 * плагинами, каждый читает своё:
 *
 * - `TListWordWrapPlugin` → `data-word-wrap` на элементах;
 * - `TListAutoWidthPlugin` → класс `--auto-width`;
 * - `TListHeightPlugin` → предел высоты контейнера;
 * - `TListScrollPlugin` → `scrollBehavior` (проверяется в своих тестах).
 *
 * Тесты переехали сюда из ядра вместе со свойствами. Раньше `wordWrap` списка
 * жил на компоненте `TList`, а разрешение «значение элемента поверх значения
 * списка» — в item-адаптере коллекции.
 *
 * Проверяется в том числе главное свойство схемы: атрибут ставится **на
 * регистрации бандла**, то есть в `setup` элемента — до его первой отрисовки,
 * включая серверную. Возражение «атрибут появится только после монтирования»
 * было причиной держать `wordWrap` на компоненте, и оно оказалось неверным.
 */

import { describe, it, expect, afterEach, beforeAll } from 'vitest'
import { TListBox, TListBoxItem, TListBoxCollectionFacade } from '@soldy/core'
import type { IListBoxItem } from '@soldy/core'
import {
	TListLayoutPlugin,
	TListAutoWidthPlugin,
	TListWordWrapPlugin,
	TListHeightPlugin,
	TElementPlugin,
	TCollectionElements,
	TCollectionBundlesPlugin,
	TPluginBundle,
} from '@soldy/plugins'
import type { IPlugin } from '@soldy/plugins'

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

beforeAll(() => {
	if (!('ResizeObserver' in globalThis)) {
		class ResizeObserverStub {
			observe(): void {}
			unobserve(): void {}
			disconnect(): void {}
		}

		;(globalThis as any).ResizeObserver = ResizeObserverStub
	}
})

afterEach(() => {
	document.body.innerHTML = ''
})

/**
 * Собирает ListBox без адаптера фреймворка.
 *
 * `plugins` перечисляются вызывающим — так видно, что каждый плагин поведения
 * работает сам по себе и тянет из раскладки только своё свойство.
 */
function createList(options: {
	items?: Array<{ text: string; wordWrap?: boolean }>
	layout?: { maxRows?: number; wordWrap?: boolean; autoWidth?: boolean }
	plugins?: Array<new () => IPlugin<any, any>>
}) {
	const owner = new TListBox()
	const collection = new TListBoxCollectionFacade({}, { owner })
	const instances = (options.items ?? []).map(
		({ text, wordWrap }) => new TListBoxItem({ value: text.toLowerCase(), text, wordWrap }),
	)

	collection.items = instances as IListBoxItem[]

	const rootElement = new TElementPlugin()
	const bundles = new TCollectionBundlesPlugin()
	const elements = new TCollectionElements()
	const layout = new TListLayoutPlugin()
	const behaviours = (options.plugins ?? []).map((Ctor) => new Ctor())

	const registry = new Map<unknown, unknown>([
		[TElementPlugin, rootElement],
		[TCollectionBundlesPlugin, bundles],
		[TCollectionElements, elements],
		[TListLayoutPlugin, layout],
	])

	const ctx = {
		getInstance: () => owner,
		get: (ctor: unknown) => registry.get(ctor),
	} as any

	bundles.install(ctx)
	elements.install(ctx)
	layout.install(ctx, options.layout)

	// Плагины поведения ставятся после раскладки — они читают её в install
	for (const plugin of behaviours) plugin.install(ctx)

	return { owner, collection, items: instances, layout, bundles, rootElement }
}

describe('TListLayoutPlugin: только свойства и события', () => {
	it('сеттер сообщает о смене', () => {
		const { layout } = createList({})
		const seen: unknown[] = []

		layout.events.on('change:maxRows', (value) => seen.push(value))
		layout.events.on('change:wordWrap', (value) => seen.push(value))

		layout.maxRows = 5
		layout.wordWrap = true

		expect(seen).toEqual([5, true])
	})

	it('повторная запись того же значения события не даёт', () => {
		const { layout } = createList({ layout: { maxRows: 5 } })
		const seen: unknown[] = []

		layout.events.on('change:maxRows', (value) => seen.push(value))

		layout.maxRows = 5

		expect(seen).toEqual([])
	})

	/**
	 * Плагин свойств ничего не применяет сам. Проверка неслучайная: он ровно
	 * потому и отделён, что раньше держал в себе и DOM, и наблюдателей, и
	 * коллекцию — четыре обязанности в одном файле.
	 */
	it('без плагинов поведения ничего не меняется ни в классах, ни у элементов', () => {
		const { owner, items, layout } = createList({
			items: [{ text: 'A' }],
			layout: { autoWidth: true, wordWrap: true },
		})

		layout.autoWidth = false
		layout.wordWrap = false

		expect(owner.classes.toString()).not.toContain('--auto-width')
		expect(items[0].dataset.get('word-wrap')).toBeUndefined()
	})
})

describe('TListWordWrapPlugin → data-word-wrap', () => {
	const setup = (
		items: Array<{ text: string; wordWrap?: boolean }>,
		layout: { wordWrap?: boolean } = {},
	) => {
		const list = createList({ items, layout, plugins: [TListWordWrapPlugin] })

		for (const item of list.items) {
			list.bundles.register(new TPluginBundle(item), item)
		}

		list.bundles.bindEngine(list.collection.engine as any)

		return list
	}

	it('берётся со списка, когда у элемента не задан', () => {
		const { items } = setup([{ text: 'A' }], { wordWrap: true })

		expect(items[0].dataset.get('word-wrap')).toBe('true')
	})

	it('значение элемента перекрывает значение списка', () => {
		const { items } = setup([{ text: 'A', wordWrap: false }], { wordWrap: true })

		expect(items[0].dataset.get('word-wrap')).toBe('false')
	})

	/**
	 * Ради этого свойства разрешение и вынесено из шаблона: иначе правило
	 * «элемент поверх списка» пришлось бы повторить в каждом из шести адаптеров.
	 */
	it('атрибут стоит до отрисовки — сразу после регистрации бандла', () => {
		const { items } = setup([{ text: 'A' }, { text: 'B' }], { wordWrap: true })

		expect(items.map((item) => item.dataset.get('word-wrap'))).toEqual(['true', 'true'])
	})

	it('смена значения у списка доходит до уже зарегистрированных элементов', () => {
		const { items, layout } = setup([{ text: 'A' }, { text: 'B', wordWrap: false }])

		layout.wordWrap = true

		expect(items.map((item) => item.dataset.get('word-wrap'))).toEqual(['true', 'false'])
	})
})

describe('TListAutoWidthPlugin → класс владельца', () => {
	const setup = (autoWidth: boolean) =>
		createList({ layout: { autoWidth }, plugins: [TListAutoWidthPlugin] })

	it('включается из значения, которое раскладка уже держит на момент install', () => {
		expect(setup(true).owner.classes.toString()).toContain('--auto-width')
	})

	it('снимается вместе со свойством', () => {
		const { owner, layout } = setup(true)

		layout.autoWidth = false

		expect(owner.classes.toString()).not.toContain('--auto-width')
	})
})

/**
 * `maxRows` ограничивает **родителя элементов**, а не корень компонента.
 *
 * Для ListBox это одно и то же, поэтому разница долго не была видна. Для Select
 * — нет: его корень это поле, а список лежит в телепортированной панели. Пока
 * плагин писал в корень, поле получало `max-height` и схлопывалось в полосу.
 *
 * Здесь панель намеренно вынесена из корня — ровно как её ставит телепорт.
 */
describe('TListHeightPlugin → высота контейнера элементов', () => {
	const ROW_HEIGHT = 20

	async function setup(rows: number, maxRows: number) {
		const list = createList({
			items: Array.from({ length: rows }, (_, i) => ({ text: `Item ${i}` })),
			layout: { maxRows },
			plugins: [TListHeightPlugin],
		})

		// Корень компонента и панель со списком — разные узлы и не вложены
		const root = document.createElement('div')
		const panel = document.createElement('div')

		document.body.append(root, panel)

		for (const item of list.items) {
			const bundle = new TPluginBundle(item)

			bundle.use(TElementPlugin as any)
			list.bundles.register(bundle, item)

			const element = document.createElement('div')

			// jsdom не считает раскладку — высоту строки задаём сами
			Object.defineProperty(element, 'offsetHeight', { value: ROW_HEIGHT })
			panel.appendChild(element)
			;(bundle.get(TElementPlugin) as TElementPlugin).element = element
		}

		list.bundles.bindEngine(list.collection.engine as any)

		list.rootElement.element = root
		await nextFrame()
		await nextFrame()

		return { root, panel, layout: list.layout }
	}

	it('высоту получает панель, а не корень компонента', async () => {
		const { root, panel } = await setup(4, 2)

		expect(panel.style.maxHeight).toBe(`${2 * ROW_HEIGHT}px`)
		expect(root.style.maxHeight).toBe('')
	})

	it('строк меньше лимита — прокрутки нет', async () => {
		const { panel } = await setup(2, 5)

		expect(panel.style.maxHeight).toBe(`${2 * ROW_HEIGHT}px`)
		expect(panel.style.overflowY).toBe('hidden')
	})

	/**
	 * `maxRows = 0` — «предела нет», и плагин обязан именно **ничего не
	 * писать**, а не выставить предел по содержимому.
	 *
	 * Разница не теоретическая. У Select потолок панели задаёт тема
	 * (`.s-select__list { max-h-64 }`), а инлайновый стиль класс перебивает.
	 * Плагин, пишущий `max-height` в размер содержимого и `overflow: hidden`,
	 * снимал теме потолок и заодно отключал прокрутку: список из сотни опций
	 * разворачивался во весь экран.
	 */
	it('maxRows = 0 предела не ставит — потолок остаётся за темой', async () => {
		const { panel } = await setup(3, 0)

		expect(panel.style.maxHeight).toBe('')
		expect(panel.style.overflowY).toBe('')
	})

	it('смена maxRows пересчитывает предел', async () => {
		const { panel, layout } = await setup(4, 2)

		layout.maxRows = 3
		await nextFrame()
		await nextFrame()

		expect(panel.style.maxHeight).toBe(`${3 * ROW_HEIGHT}px`)
	})
})
