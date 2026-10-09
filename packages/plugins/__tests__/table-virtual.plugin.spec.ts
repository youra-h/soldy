// @vitest-environment jsdom

/**
 * TTableVirtualPlugin — окно таблицы в документе: замер видимой полосы тела и
 * шага строк и строка с DOM-фокусом.
 *
 * Раскладки в jsdom нет, поэтому размеры тест подменяет сам: верх тела, верхи
 * строк и окно контейнера. Разметку строит он же, как её рисует Vue, а узлы
 * строк регистрирует в реестре bundles, как адаптер. Что окно рисует по
 * замеру, — `core/__tests__/table-virtual.spec.ts`; настоящая прокрутка —
 * `playground/vue/browser/table-virtual.spec.ts`.
 */

import { describe, it, expect, afterAll, afterEach, beforeAll, vi } from 'vitest'
import { TTable, createEngineTable } from '@soldy-ui/core'
import type { ITableRow, TTableCollection } from '@soldy-ui/core'
import {
	TCollectionBundlesPlugin,
	TCollectionElements,
	TElementPlugin,
	TPluginBundle,
	TTableVirtualPlugin,
} from '../src'
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

/** Бокс узла: верх и высота, остальное раскладке теста не нужно. */
function place(node: Element, top: number, height: number): void {
	node.getBoundingClientRect = () => DOMRect.fromRect({ x: 0, y: top, width: 100, height })
}

/** Заглушка `ResizeObserver`: в jsdom его нет, а размеры тест подаёт сам. */
class ResizeObserverStub {
	observe(): void {}
	unobserve(): void {}
	disconnect(): void {}
}

beforeAll(() => {
	vi.stubGlobal('ResizeObserver', ResizeObserverStub)
})

afterAll(() => {
	vi.unstubAllGlobals()
})

const bundles: TPluginBundle[] = []

afterEach(() => {
	for (const bundle of bundles.splice(0)) bundle.destroy()

	document.body.innerHTML = ''
	vi.restoreAllMocks()
})

const STEP = 40
const BODY_TOP = 100

/**
 * Таблица из трёх строк в режиме окна: тело с верхом в 100 px, строки по 40
 * px подряд. `container` — обёртка с прокруткой, без неё таблицу прокручивает
 * страница.
 */
async function mount(options: { container?: boolean; heights?: number[] } = {}) {
	const owner = new TTable()
	const engine: TTableCollection = createEngineTable({
		owner,
		items: [1, 2, 3].map((id) => ({ data: { id } })),
	})

	engine.extensions.virtual.virtual = true

	const bundle = new TPluginBundle(owner)
		.use(TElementPlugin)
		.use(TCollectionBundlesPlugin)
		.use(TCollectionElements)
		.use(TTableVirtualPlugin)

	bundles.push(bundle)
	pluginOf(bundle, TCollectionBundlesPlugin).bindEngine(engine)

	const outside = document.createElement('button')
	const root = document.createElement('table')
	const body = document.createElement('tbody')
	const parent = options.container ? document.createElement('div') : document.body

	root.className = owner.classes.base
	body.className = owner.classes.resolve('__body')
	root.append(body)
	place(body, BODY_TOP, 3 * STEP)

	if (options.container && parent instanceof HTMLDivElement) {
		parent.style.overflowY = 'auto'
		Object.defineProperty(parent, 'clientHeight', { value: 200 })
		Object.defineProperty(parent, 'scrollHeight', { value: 2000 })
		place(parent, 50, 200)
		document.body.append(parent)
	}

	parent.append(root)
	document.body.append(outside)

	let top = BODY_TOP
	const heights = options.heights ?? [STEP, STEP, STEP]

	engine.extensions.batch.shown.forEach((row, index) => {
		const line = document.createElement('tr')
		const cell = document.createElement('td')
		const rowBundle = new TPluginBundle(row).use(TElementPlugin)

		cell.tabIndex = -1
		line.append(cell)
		body.append(line)
		place(line, top, heights[index])
		top += heights[index]
		bundles.push(rowBundle)
		pluginOf(rowBundle, TElementPlugin).element = line
		pluginOf(bundle, TCollectionBundlesPlugin).register(rowBundle, row)
	})

	const viewport = vi.spyOn(engine.extensions.virtual, 'notifyViewport')
	const focus = vi.spyOn(engine.extensions.virtual, 'notifyFocus')

	pluginOf(bundle, TElementPlugin).element = root
	// Узел объявляется кадром, первый замер — следующим
	await nextFrame()
	await nextFrame()

	const rows = engine.extensions.batch.shown
	const cellOf = (row: ITableRow) => pluginOf(bundle, TCollectionElements).getElementByItem(row)

	return { engine, root, outside, parent, rows, cellOf, viewport, focus }
}

describe('замер', () => {
	it('страница: полоса — окно браузера от верха тела, шаг — расстояние между строками', async () => {
		const { viewport } = await mount()

		expect(viewport).toHaveBeenLastCalledWith({
			top: -BODY_TOP,
			bottom: window.innerHeight - BODY_TOP,
			step: STEP,
		})
	})

	it('контейнер с прокруткой: полоса — его окно', async () => {
		const { viewport } = await mount({ container: true })

		expect(viewport).toHaveBeenLastCalledWith({
			top: 50 - BODY_TOP,
			bottom: 250 - BODY_TOP,
			step: STEP,
		})
	})

	it('поводы за кадр сводятся в один замер', async () => {
		const { parent, viewport } = await mount({ container: true })

		viewport.mockClear()

		for (let index = 0; index < 3; index++) parent.dispatchEvent(new Event('scroll'))
		window.dispatchEvent(new Event('scroll'))
		await nextFrame()

		expect(viewport).toHaveBeenCalledTimes(1)
	})

	it('строка выше шага — одно предупреждение за монтирование', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
		const { viewport } = await mount({ heights: [STEP, STEP * 2, STEP] })

		window.dispatchEvent(new Event('scroll'))
		await nextFrame()

		expect(viewport).toHaveBeenLastCalledWith(expect.objectContaining({ step: STEP }))
		expect(warn).toHaveBeenCalledTimes(1)
	})

	it('режим выключили — документ не слушается', async () => {
		const { engine, viewport } = await mount()

		engine.extensions.virtual.virtual = false
		viewport.mockClear()
		window.dispatchEvent(new Event('scroll'))
		await nextFrame()

		expect(viewport).not.toHaveBeenCalled()
	})
})

describe('фокус', () => {
	it('фокус пришёл в строку — окну её строка; ушёл из таблицы — строки нет', async () => {
		const { rows, cellOf, outside, focus } = await mount()
		const cell = cellOf(rows[1])?.firstElementChild

		if (!(cell instanceof HTMLElement)) throw new Error('ячейки нет')

		cell.focus()

		expect(focus).toHaveBeenLastCalledWith(rows[1])

		outside.focus()

		expect(focus).toHaveBeenLastCalledWith(undefined)
	})

	it('окно браузера потеряло фокус — строка с фокусом остаётся', async () => {
		const { rows, cellOf, focus } = await mount()
		const cell = cellOf(rows[0])?.firstElementChild

		if (!(cell instanceof HTMLElement)) throw new Error('ячейки нет')

		cell.focus()
		focus.mockClear()
		cell.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }))

		expect(focus).not.toHaveBeenCalled()
	})
})
