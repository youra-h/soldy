// @vitest-environment jsdom

/**
 * TTableLayoutPlugin — место под колонки таблицы: ширина её окна без колонки
 * выбора.
 *
 * Разметку тест строит сам — окно, таблицу и шапку с ячейкой колонки выбора,
 * как их рисует Vue, — а плагин собран настоящим набором над настоящей
 * таблицей и движком строк. `ResizeObserver` в jsdom нет — его заменяет
 * заглушка, которую тест срабатывает сам и в которой задаёт ширину окна;
 * коробку ячейки выбора задаёт тест. Как место раскладывается в ширины
 * колонок, — `core/__tests__/table-layout.spec.ts`; настоящая раскладка —
 * `playground/vue/browser/table.spec.ts`.
 */

import { describe, it, expect, afterEach, afterAll, beforeAll, vi } from 'vitest'
import { TTable, createEngineTable } from '@soldy-ui/core'
import type { TTableCollection } from '@soldy-ui/core'
import { TCollectionBundlesPlugin, TElementPlugin, TPluginBundle, TTableLayoutPlugin } from '../src'
import type { IPlugin, IPluginConstructor } from '../src'

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

/** Плагин, который тест поставил сам: без него дальше проверять нечего. */
function pluginOf<P extends IPlugin<any, any>>(
	bundle: TPluginBundle,
	ctor: IPluginConstructor<any, any, P>,
): P {
	const plugin = bundle.get(ctor)

	if (!plugin) throw new Error(`${ctor.name} не установлен в bundle`)

	return plugin
}

/** Уведомление наблюдателя, как его отдаёт браузер: узел и коробка содержимого. */
type TEntry = { target: Element; contentRect: { width: number } }

/**
 * Заглушка `ResizeObserver`: помнит колбэк и наблюдаемые узлы, а срабатывает,
 * когда велит тест, — с шириной содержимого узла.
 */
class ResizeObserverStub {
	readonly observed = new Set<Element>()

	constructor(private readonly _callback: (entries: TEntry[]) => void) {
		observers.push(this)
	}

	observe(element: Element): void {
		this.observed.add(element)
	}

	unobserve(element: Element): void {
		this.observed.delete(element)
	}

	disconnect(): void {
		this.observed.clear()
	}

	trigger(element: Element, width: number): void {
		if (this.observed.has(element))
			this._callback([{ target: element, contentRect: { width } }])
	}
}

let observers: ResizeObserverStub[] = []

beforeAll(() => {
	vi.stubGlobal('ResizeObserver', ResizeObserverStub)
})

afterAll(() => {
	vi.unstubAllGlobals()
})

const bundles: TPluginBundle[] = []

afterEach(() => {
	for (const bundle of bundles.splice(0)) bundle.destroy()

	observers = []
	document.body.innerHTML = ''
})

/** Наблюдатель сообщил ширину узла. */
function resize(element: Element, width: number): void {
	for (const observer of observers) observer.trigger(element, width)
}

const observing = (element: Element) => observers.some((observer) => observer.observed.has(element))

/**
 * Таблица в окне: окно, корень, шапка, в ней — ячейка колонки выбора
 * шириной `select` (без неё — `undefined`) и заголовок колонки. Движок —
 * снаружи, с одной гибкой колонкой; узел корня объявлен плагинам.
 */
async function mount(options: { select?: number; viewport?: boolean; bind?: boolean } = {}) {
	const { select, viewport = true, bind = true } = options
	const owner = new TTable()
	const engine = createEngineTable({ owner })

	engine.extensions.columns.columns = [{ field: 'name', text: 'Имя' }]

	const bundle = new TPluginBundle(owner)
		.use(TElementPlugin)
		.use(TCollectionBundlesPlugin)
		.use(TTableLayoutPlugin)

	bundles.push(bundle)

	if (bind) pluginOf(bundle, TCollectionBundlesPlugin).bindEngine(engine)

	const view = document.createElement('div')
	const root = document.createElement('table')
	const head = document.createElement('thead')
	const row = document.createElement('tr')
	const column = document.createElement('th')

	view.className = viewport ? owner.classes.resolve('__viewport') : 'wrapper'
	root.className = owner.classes.base
	head.className = owner.classes.resolve('__head')
	row.className = owner.classes.resolve('__head-row')

	if (select !== undefined) {
		const cell = document.createElement('th')

		cell.className = owner.classes.resolve('__select')
		vi.spyOn(cell, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, select, 40))
		row.append(cell)
	}

	row.append(column)
	head.append(row)
	root.append(head)
	view.append(root)
	document.body.append(view)

	const notify = vi.spyOn(engine.extensions.columns, 'notifySpace')

	pluginOf(bundle, TElementPlugin).element = root
	await nextFrame()

	return { owner, engine, bundle, view, root, row, notify }
}

/** Ширина единственной колонки — по месту, которое отдал плагин. */
const nameWidth = (engine: TTableCollection) => engine.extensions.columns.shownColumns[0].width

describe('место', () => {
	it('внутренняя ширина окна — кадром позже уведомления: в колбэке наблюдателя плагин не пишет', async () => {
		const { owner, engine, view, notify } = await mount()

		resize(view, 600)

		expect(notify).not.toHaveBeenCalled()

		await nextFrame()

		expect(notify.mock.calls).toEqual([[600]])
		expect(nameWidth(engine)).toBe(600)
		expect(owner.dataset.get('overflow')).toBe('false')
	})

	it('без ячейки колонки выбора — ширина окна, с ней — минус её ширина', async () => {
		const { view, notify } = await mount({ select: 48 })

		resize(view, 600)
		await nextFrame()

		expect(notify.mock.calls).toEqual([[552]])
	})

	it('дробное — вниз до целого', async () => {
		const { view, notify } = await mount({ select: 48.4 })

		resize(view, 600.9)
		await nextFrame()

		expect(notify.mock.calls).toEqual([[552]])
	})

	it('ячейка выбора — только своей шапки: вложенная таблица в заголовке не в счёт', async () => {
		const { owner, view, row, notify } = await mount()
		const nested = document.createElement('div')
		const select = document.createElement('th')

		select.className = owner.classes.resolve('__select')
		vi.spyOn(select, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 48, 40))
		nested.append(select)
		row.lastElementChild?.append(nested)

		resize(view, 600)
		await nextFrame()

		expect(notify.mock.calls).toEqual([[600]])
	})

	it('подряд идущие уведомления — один замер', async () => {
		const { view, root, notify } = await mount()

		resize(view, 500)
		resize(root, 480)
		resize(view, 600)
		await nextFrame()

		expect(notify.mock.calls).toEqual([[600]])
	})

	it('корень сменил размер — замер с прежней шириной окна: появилась колонка выбора', async () => {
		const { owner, view, root, row, notify } = await mount()

		resize(view, 600)
		await nextFrame()

		const cell = document.createElement('th')

		cell.className = owner.classes.resolve('__select')
		vi.spyOn(cell, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 48, 40))
		row.prepend(cell)

		resize(root, 648)
		await nextFrame()

		expect(notify.mock.calls).toEqual([[600], [552]])
	})

	it('наблюдает окно и корень', async () => {
		const { view, root } = await mount()

		expect(observing(view)).toBe(true)
		expect(observing(root)).toBe(true)
	})

	it('корень не в окне — места нет: плагин не наблюдает и не пишет', async () => {
		const { view, root, notify } = await mount({ viewport: false })

		expect(observing(view)).toBe(false)
		expect(observing(root)).toBe(false)

		await nextFrame()

		expect(notify).not.toHaveBeenCalled()
	})

	it('движок привязали после корня — замер по уже известной ширине окна', async () => {
		const { bundle, engine, view } = await mount({ bind: false })

		resize(view, 600)
		await nextFrame()

		pluginOf(bundle, TCollectionBundlesPlugin).bindEngine(engine)
		await nextFrame()

		expect(nameWidth(engine)).toBe(600)
	})
})

describe('снятие', () => {
	it('корень сняли — место неизвестно, наблюдение снято', async () => {
		const { owner, engine, bundle, view, root, notify } = await mount()

		resize(view, 600)
		await nextFrame()

		pluginOf(bundle, TElementPlugin).element = null

		expect(notify).toHaveBeenLastCalledWith(0)
		expect(nameWidth(engine)).toBeUndefined()
		expect(owner.dataset.has('overflow')).toBe(false)
		expect(observing(view)).toBe(false)
		expect(observing(root)).toBe(false)
	})

	it('destroy — место неизвестно: движок снаружи переживает таблицу', async () => {
		const { engine, bundle, view } = await mount()

		resize(view, 600)
		await nextFrame()

		bundles.splice(bundles.indexOf(bundle), 1)
		bundle.destroy()

		expect(nameWidth(engine)).toBeUndefined()
	})

	it('уведомление после снятия ничего не пишет', async () => {
		const { bundle, view, notify } = await mount()

		resize(view, 600)
		bundles.splice(bundles.indexOf(bundle), 1)
		bundle.destroy()
		notify.mockClear()

		await nextFrame()

		expect(notify).not.toHaveBeenCalled()
	})
})
