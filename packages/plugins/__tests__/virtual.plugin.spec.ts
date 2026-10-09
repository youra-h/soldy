// @vitest-environment jsdom

/**
 * TVirtualPlugin — окно коллекции в документе: замер видимой полосы и шага
 * элементов и элемент с DOM-фокусом.
 *
 * Раскладки в jsdom нет, поэтому размеры тест подменяет сам: верхи элементов и
 * окно контейнера. Разметку строит он же, как её рисует Vue, а узлы элементов
 * регистрирует в реестре bundles, как адаптер. Плагин ставится в набор после
 * привязки движка — так его ставит обёртка `Virtual`. Что окно рисует по
 * замеру, — `core/__tests__/collection.draw.spec.ts` и `table-virtual.spec.ts`;
 * настоящая прокрутка — `playground/vue/browser/table-virtual.spec.ts` и
 * `list-box-virtual.spec.ts`.
 */

import { describe, it, expect, afterAll, afterEach, beforeAll, vi } from 'vitest'
import {
	TListBox,
	TTable,
	TWindowStrategy,
	createEngineListBox,
	createEngineTable,
} from '@soldy-ui/core'
import type { TCollectionEngine, TDrawable } from '@soldy-ui/core'
import {
	TCollectionBundlesPlugin,
	TCollectionElements,
	TElementPlugin,
	TPluginBundle,
	TVirtualPlugin,
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

/** Окно прокрутки узла: видна полоса `height` пикселей из `scrollHeight`. */
function scrollable(node: HTMLElement, top: number, height: number): void {
	node.style.overflowY = 'auto'
	Object.defineProperty(node, 'clientHeight', { value: height })
	Object.defineProperty(node, 'scrollHeight', { value: 2000 })
	place(node, top, height)
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
const LIST_TOP = 100

type TMountOptions = {
	/** Обёртка с прокруткой вокруг компонента; без неё компонент прокручивает страница. */
	container?: boolean
	/** Высоты элементов по порядку; по умолчанию все — `STEP`. */
	heights?: number[]
}

/**
 * Компонент над движком в окне: корень, список элементов в нём, узлы
 * элементов подряд от `LIST_TOP`. `list` строит разметку и отдаёт родителя
 * элементов.
 */
async function mountOver(
	owner: object,
	engine: TCollectionEngine<any, any>,
	root: HTMLElement,
	list: HTMLElement,
	options: TMountOptions = {},
) {
	engine.extensions.draw.useStrategy(new TWindowStrategy())

	const bundle = new TPluginBundle(owner)
		.use(TElementPlugin)
		.use(TCollectionBundlesPlugin)
		.use(TCollectionElements)

	bundles.push(bundle)
	pluginOf(bundle, TCollectionBundlesPlugin).bindEngine(engine)
	// Окно ставит плагин в набор, когда движок уже привязан
	bundle.use(TVirtualPlugin)

	const outside = document.createElement('button')
	const parent = options.container ? document.createElement('div') : document.body

	if (options.container && parent instanceof HTMLDivElement) {
		scrollable(parent, 50, 200)
		document.body.append(parent)
	}

	parent.append(root)
	document.body.append(outside)

	let top = LIST_TOP
	const items: TDrawable[] = engine.extensions.batch.shown
	const heights = options.heights ?? items.map(() => STEP)

	items.forEach((item, index) => {
		const node = document.createElement('div')
		const row = document.createElement('div')
		const itemBundle = new TPluginBundle(item).use(TElementPlugin)

		row.tabIndex = -1
		node.append(row)
		list.append(node)
		place(node, top, heights[index])
		top += heights[index]
		bundles.push(itemBundle)
		pluginOf(itemBundle, TElementPlugin).element = node
		pluginOf(bundle, TCollectionBundlesPlugin).register(itemBundle, item)
	})

	const viewport = vi.spyOn(engine.extensions.draw, 'notifyViewport')
	const pin = vi.spyOn(engine.extensions.draw, 'pin')

	pluginOf(bundle, TElementPlugin).element = root
	// Узел объявляется кадром, первый замер — следующим
	await nextFrame()
	await nextFrame()

	const rowOf = (item: TDrawable) => {
		const row = pluginOf(bundle, TCollectionElements).getElementByItem(item)?.firstElementChild

		if (!(row instanceof HTMLElement)) throw new Error('строки нет')

		return row
	}

	const registry = pluginOf(bundle, TCollectionBundlesPlugin)

	return { engine, root, list, outside, parent, items, registry, rowOf, viewport, pin }
}

/** Таблица из трёх строк: корень `table`, строки — в теле. */
function mountTable(options: TMountOptions = {}) {
	const owner = new TTable()
	const engine = createEngineTable({ owner, items: [1, 2, 3].map((id) => ({ data: { id } })) })
	const root = document.createElement('table')
	const body = document.createElement('tbody')

	root.append(body)

	return mountOver(owner, engine, root, body, options)
}

/**
 * Список из трёх элементов, который прокручивается сам: элементы — прямо в
 * корне, а у корня своё окно прокрутки, как у ListBox с `maxRows`.
 */
function mountScrollingList() {
	const owner = new TListBox()
	const engine = createEngineListBox({ items: ['a', 'b', 'c'].map((value) => ({ value })) })
	const root = document.createElement('div')

	scrollable(root, LIST_TOP, 80)

	return mountOver(owner, engine, root, root)
}

describe('замер', () => {
	it('страница: полоса — окно браузера от верха списка, шаг — расстояние между элементами', async () => {
		const { viewport } = await mountTable()

		expect(viewport).toHaveBeenLastCalledWith({
			top: -LIST_TOP,
			bottom: window.innerHeight - LIST_TOP,
			step: STEP,
		})
	})

	it('предок с прокруткой: полоса — его окно', async () => {
		const { viewport } = await mountTable({ container: true })

		expect(viewport).toHaveBeenLastCalledWith({
			top: 50 - LIST_TOP,
			bottom: 250 - LIST_TOP,
			step: STEP,
		})
	})

	it('родитель элементов прокручивается сам: полоса — его окно, прокрутку слушают у него', async () => {
		const { root, viewport } = await mountScrollingList()

		expect(viewport).toHaveBeenLastCalledWith({ top: 0, bottom: 80, step: STEP })

		viewport.mockClear()
		root.dispatchEvent(new Event('scroll'))
		await nextFrame()

		expect(viewport).toHaveBeenCalledOnce()
	})

	it('верх списка — верх нарисованного элемента минус его место, умноженное на шаг', async () => {
		const { items, list, registry, viewport } = await mountTable()

		// Узла первого элемента в документе нет: первым нарисован второй — место 1
		registry.unregister(items[0].uid)
		list.firstElementChild?.remove()
		viewport.mockClear()
		window.dispatchEvent(new Event('scroll'))
		await nextFrame()

		// Верх списка — на шаг выше второго элемента, там же, где был
		expect(viewport).toHaveBeenLastCalledWith({
			top: -LIST_TOP,
			bottom: window.innerHeight - LIST_TOP,
			step: STEP,
		})
	})

	it('поводы за кадр сводятся в один замер', async () => {
		const { parent, viewport } = await mountTable({ container: true })

		viewport.mockClear()

		for (let index = 0; index < 3; index++) parent.dispatchEvent(new Event('scroll'))
		window.dispatchEvent(new Event('scroll'))
		await nextFrame()

		expect(viewport).toHaveBeenCalledTimes(1)
	})

	it('элемент выше шага — одно предупреждение за монтирование', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
		const { viewport } = await mountTable({ heights: [STEP, STEP * 2, STEP] })

		window.dispatchEvent(new Event('scroll'))
		await nextFrame()

		expect(viewport).toHaveBeenLastCalledWith(expect.objectContaining({ step: STEP }))
		expect(warn).toHaveBeenCalledTimes(1)
	})

	it('окно сняли — документ не слушается', async () => {
		const { engine, viewport } = await mountTable()

		engine.extensions.draw.useStrategy(null)
		viewport.mockClear()
		window.dispatchEvent(new Event('scroll'))
		await nextFrame()

		expect(viewport).not.toHaveBeenCalled()
	})
})

describe('фокус', () => {
	it('фокус пришёл в элемент — он закреплён; ушёл из компонента — закрепления нет', async () => {
		const { items, rowOf, outside, pin } = await mountTable()

		rowOf(items[1]).focus()

		expect(pin).toHaveBeenLastCalledWith('focus', items[1])

		outside.focus()

		expect(pin).toHaveBeenLastCalledWith('focus', undefined)
	})

	it('окно браузера потеряло фокус — закрепление остаётся', async () => {
		const { items, rowOf, pin } = await mountTable()
		const row = rowOf(items[0])

		row.focus()
		pin.mockClear()
		row.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }))

		expect(pin).not.toHaveBeenCalled()
	})
})
