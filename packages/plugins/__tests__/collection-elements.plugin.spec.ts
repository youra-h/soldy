// @vitest-environment jsdom

/**
 * Реестр узлов элементов коллекции (`TCollectionElements` над
 * `TCollectionBundlesPlugin`) и его потребитель — перетаскивание
 * (`TDragPlugin`). Движок приходит к ним без типа, и состав коллекции они
 * находят охранником (`batchOf`), а не чтением `engine.extensions` наугад
 * (docs/agents/collections.md, «Сосед по коллекции — по контракту»): узлы
 * идут порядком состава.
 *
 * Узел, которого ещё нет в документе, ждут помощником реестра (`waitFor`):
 * на входе элемента в коллекцию и на `ready` его узла. Его потребители —
 * запись `focused` (`action.plugin.spec.ts`) и клавиатура календаря
 * (`calendar-keyboard.plugin.spec.ts`).
 *
 * Перетаскивание переставляет не само: жест DOM оно переводит в команду
 * обёртки `DragAndDrop` (`TDragAndDrop.move`), и команда шлёт свои события и
 * переставляет элемент в движке. Правила команды —
 * `core/__tests__/drag-and-drop.spec.ts`; здесь — жест: кого берут, когда
 * спрашивают место и чьё перетаскивание принимают.
 */

import { describe, it, expect, afterEach, vi } from 'vitest'
import { TDragAndDrop, TListBox, TListBoxCollectionFacade } from '@soldy-ui/core'
import type { IDragAndDropMove, IListBoxItem } from '@soldy-ui/core'
import {
	TCollectionBundlesPlugin,
	TCollectionElements,
	TDragPlugin,
	TElementPlugin,
	TPluginBundle,
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

const bundles: TPluginBundle[] = []

afterEach(() => {
	for (const bundle of bundles.splice(0)) bundle.destroy()

	document.body.innerHTML = ''
})

/**
 * Список из трёх элементов. Узлы смонтированы в обратном порядке — порядок
 * реестра от порядка регистрации не зависит, он берётся из состава.
 */
function setup() {
	const owner = new TListBox()
	const facade = new TListBoxCollectionFacade(
		{ items: ['a', 'b', 'c'].map((value) => ({ value, text: value })) },
		{ owner },
	)
	const engine = facade.engine
	const items = engine.extensions.batch.items
	const root = document.body.appendChild(document.createElement('div'))
	const bundle = new TPluginBundle(owner)
		.use(TElementPlugin)
		.use(TCollectionBundlesPlugin)
		.use(TCollectionElements)
		.use(TDragPlugin)

	bundles.push(bundle)

	const registry = pluginOf(bundle, TCollectionBundlesPlugin)
	const nodes = new Map<IListBoxItem, Element>()

	registry.bindEngine(engine)

	for (const item of [...items].reverse()) {
		const itemBundle = new TPluginBundle(item).use(TElementPlugin)
		const node = root.appendChild(document.createElement('div'))

		bundles.push(itemBundle)
		registry.register(itemBundle, item)
		pluginOf(itemBundle, TElementPlugin).element = node
		nodes.set(item, node)
	}

	pluginOf(bundle, TElementPlugin).element = root

	const nodeOf = (item: IListBoxItem): Element => {
		const node = nodes.get(item)

		if (!node) throw new Error(`узел элемента ${item.value} не смонтирован`)

		return node
	}

	return {
		engine,
		items,
		nodeOf,
		elements: pluginOf(bundle, TCollectionElements),
		drag: pluginOf(bundle, TDragPlugin),
	}
}

describe('TCollectionElements — узлы по составу коллекции', () => {
	it('все узлы — порядком состава, а не регистрации', () => {
		const { items, nodeOf, elements } = setup()

		expect(elements.getAll()).toEqual(items.map(nodeOf))
	})

	it('узел по месту в составе и uid по узлу', () => {
		const { items, nodeOf, elements } = setup()

		expect(elements.getElementByIndex(1)).toBe(nodeOf(items[1]))
		expect(elements.getUidByElement(nodeOf(items[2]))).toBe(items[2].uid)
		expect(elements.getUidByElement(document.createElement('div'))).toBeUndefined()
	})
})

describe('TCollectionElements.waitFor — ожидание узла', () => {
	/**
	 * Коллекция из двух элементов, ни один из которых ещё не нарисован. Вход
	 * элемента в коллекцию (`register`) и привязка его узла (`bind`) — два
	 * шага, и тест делает их порознь: их порядок решает адаптер.
	 */
	function undrawn() {
		const owner = new TListBox()
		const facade = new TListBoxCollectionFacade(
			{ items: ['a', 'b'].map((value) => ({ value, text: value })) },
			{ owner },
		)
		const engine = facade.engine
		const bundle = new TPluginBundle(owner)
			.use(TCollectionBundlesPlugin)
			.use(TCollectionElements)
		const registry = pluginOf(bundle, TCollectionBundlesPlugin)

		bundles.push(bundle)
		registry.bindEngine(engine)

		const draw = (item: IListBoxItem) => {
			const itemBundle = new TPluginBundle(item).use(TElementPlugin)
			const node = document.createElement('div')

			bundles.push(itemBundle)

			return {
				item,
				node,
				register: () => registry.register(itemBundle, item),
				bind: () => {
					document.body.appendChild(node)
					pluginOf(itemBundle, TElementPlugin).element = node
				},
			}
		}

		const [a, b] = engine.extensions.batch.items

		return { elements: pluginOf(bundle, TCollectionElements), a: draw(a), b: draw(b) }
	}

	it('проверка зовётся на входе элемента в коллекцию и ещё раз на ready его узла', async () => {
		const { elements, a } = undrawn()
		const check = vi.fn(() => false)

		elements.waitFor(check)

		// Первую попытку делает тот, кто ждёт: помощник проверку сам не зовёт
		expect(check).not.toHaveBeenCalled()

		a.register()

		expect(check).toHaveBeenCalledTimes(1)

		// Узел привязан, но объявят его кадром позже
		a.bind()

		expect(check).toHaveBeenCalledTimes(1)

		await nextFrame()

		expect(check).toHaveBeenCalledTimes(2)
	})

	/**
	 * Бывает, что элемент входит в коллекцию после принятия компонента, когда
	 * узел уже привязан и объявлен: `ready` пришло раньше входа, и подписка на
	 * него опоздала бы. Проверка на входе узел уже видит.
	 */
	it('узел объявлен раньше, чем элемент вошёл в коллекцию, — проверка на входе его видит', async () => {
		const { elements, a } = undrawn()
		const seen: (Element | null)[] = []

		elements.waitFor(() => {
			seen.push(elements.getElementByItem(a.item))

			return false
		})

		a.bind()
		await nextFrame()

		expect(seen).toEqual([])

		a.register()

		expect(seen).toEqual([a.node])
	})

	it('проверка вернула true — ожидание кончено: ни вход, ни ready её больше не зовут', async () => {
		const { elements, a, b } = undrawn()
		const check = vi.fn(() => true)

		elements.waitFor(check)
		a.register()
		a.bind()
		b.register()
		b.bind()
		await nextFrame()

		expect(check).toHaveBeenCalledTimes(1)
	})

	it('снятое ожидание проверку не зовёт, повторное снятие ничего не делает', async () => {
		const { elements, a, b } = undrawn()
		const check = vi.fn(() => false)
		const stop = elements.waitFor(check)

		a.register()
		stop()
		stop()
		a.bind()
		b.register()
		b.bind()
		await nextFrame()

		expect(check).toHaveBeenCalledTimes(1)
	})

	it('ожидания независимы: снятие одного другое не трогает', () => {
		const { elements, a } = undrawn()
		const first = vi.fn(() => false)
		const second = vi.fn(() => false)

		elements.waitFor(first)()
		elements.waitFor(second)
		a.register()

		expect(first).not.toHaveBeenCalled()
		expect(second).toHaveBeenCalledTimes(1)
	})
})

/**
 * Событие перетаскивания на узле — всплывает и отменяется, как у браузера.
 * `DragEvent` и `DataTransfer` в jsdom нет: данные жеста, если они нужны
 * тесту, — заглушка на месте `dataTransfer`.
 */
function fire(node: Element, type: string, dataTransfer?: object): Event {
	const event = new Event(type, { bubbles: true, cancelable: true })

	if (dataTransfer) Object.defineProperty(event, 'dataTransfer', { value: dataTransfer })

	node.dispatchEvent(event)

	return event
}

/**
 * Перетаскивание включено командой обёртки: плагин переводит жест в
 * `TDragAndDrop.move`, а события и перемещение в движке — её. Обработчики
 * встают на корень, когда он объявлен, — кадром позже.
 */
async function activated() {
	const context = setup()
	const dnd = new TDragAndDrop()
	const asked: { item: object; newIndex: number }[] = []
	const moved: IDragAndDropMove[] = []

	dnd.events.on('move:before', ({ item, newIndex }) => asked.push({ item, newIndex }))
	dnd.events.on('move', (e) => moved.push(e))
	context.drag.activate(context.engine, dnd)
	await nextFrame()

	return { ...context, dnd, asked, moved }
}

/** Порядок значений в составе коллекции. */
const order = (items: ReadonlyArray<IListBoxItem>) => items.map((item) => item.value)

describe('TDragPlugin — жест перестановки командой обёртки', () => {
	it('элементы коллекции перетаскиваемые, после снятия набора — нет', async () => {
		const { items, nodeOf, drag } = await activated()

		expect(items.map((item) => nodeOf(item).getAttribute('draggable'))).toEqual([
			'true',
			'true',
			'true',
		])

		drag.destroy()

		expect(items.map((item) => nodeOf(item).hasAttribute('draggable'))).toEqual([
			false,
			false,
			false,
		])
	})

	it('элемент, перетащенный на место третьего, переставляет обёртка: move с местом в составе', async () => {
		const { engine, items, nodeOf, drag, moved } = await activated()
		const starts: { index: number; uid: string | number }[] = []

		drag.events.on('drag:start', (payload) => starts.push(payload))

		fire(nodeOf(items[0]), 'dragstart')
		fire(nodeOf(items[2]), 'dragover')

		expect(starts).toEqual([{ index: 0, uid: items[0].uid }])
		expect(order(engine.extensions.batch.items)).toEqual(['b', 'c', 'a'])
		expect(moved).toEqual([{ engine, item: items[0], oldIndex: 0, newIndex: 2 }])
	})

	it('жест через два места — две перестановки, место взятого — из состава', async () => {
		const { engine, items, nodeOf, moved } = await activated()

		fire(nodeOf(items[2]), 'dragstart')
		fire(nodeOf(items[1]), 'dragover')
		fire(nodeOf(items[0]), 'dragover')

		expect(order(engine.extensions.batch.items)).toEqual(['c', 'a', 'b'])
		expect(moved.map(({ oldIndex, newIndex }) => [oldIndex, newIndex])).toEqual([
			[2, 1],
			[1, 0],
		])
	})

	it('отменённое место над тем же элементом не переспрашивается, над другим — спрашивается', async () => {
		const { engine, items, nodeOf, dnd, asked } = await activated()

		dnd.events.on('move:before', (e) => e.preventDefault())

		fire(nodeOf(items[0]), 'dragstart')
		// `dragover` идёт непрерывно, пока указатель стоит над элементом
		fire(nodeOf(items[2]), 'dragover')
		fire(nodeOf(items[2]), 'dragover')
		fire(nodeOf(items[2]), 'dragover')

		expect(asked).toEqual([{ item: items[0], newIndex: 2 }])

		fire(nodeOf(items[1]), 'dragover')
		fire(nodeOf(items[2]), 'dragover')

		expect(asked).toEqual([
			{ item: items[0], newIndex: 2 },
			{ item: items[0], newIndex: 1 },
			{ item: items[0], newIndex: 2 },
		])
		expect(order(engine.extensions.batch.items)).toEqual(['a', 'b', 'c'])
	})

	it('dragstart выключенного элемента отменён: жеста нет, перестановки нет', async () => {
		const { engine, items, nodeOf, drag, asked } = await activated()
		const starts: unknown[] = []

		drag.events.on('drag:start', (payload) => starts.push(payload))
		items[0].disabled = true

		const start = fire(nodeOf(items[0]), 'dragstart')
		const over = fire(nodeOf(items[2]), 'dragover')

		expect(start.defaultPrevented).toBe(true)
		expect(over.defaultPrevented).toBe(false)
		expect(starts).toEqual([])
		expect(asked).toEqual([])
		expect(order(engine.extensions.batch.items)).toEqual(['a', 'b', 'c'])
	})

	it('чужое перетаскивание — файл, текст — не принято: dragover и drop как без плагина', async () => {
		const { items, nodeOf, asked } = await activated()

		const over = fire(nodeOf(items[1]), 'dragover')
		const drop = fire(nodeOf(items[1]), 'drop')

		expect(over.defaultPrevented).toBe(false)
		expect(drop.defaultPrevented).toBe(false)
		expect(asked).toEqual([])
	})

	it('свой жест принят: dragover и drop — без действия браузера, после dragend — снова чужие', async () => {
		const { items, nodeOf } = await activated()

		fire(nodeOf(items[0]), 'dragstart')

		expect(fire(nodeOf(items[1]), 'dragover').defaultPrevented).toBe(true)
		expect(fire(nodeOf(items[1]), 'drop').defaultPrevented).toBe(true)

		fire(nodeOf(items[0]), 'dragend')

		expect(fire(nodeOf(items[1]), 'dragover').defaultPrevented).toBe(false)
	})

	it('свой жест кладёт данные и разрешает только перемещение: без данных Firefox жест не начинает', async () => {
		const { items, nodeOf } = await activated()
		const data: [string, string][] = []
		const transfer = {
			effectAllowed: 'uninitialized',
			dropEffect: 'none',
			setData: (format: string, value: string) => data.push([format, value]),
		}

		fire(nodeOf(items[0]), 'dragstart', transfer)
		fire(nodeOf(items[1]), 'dragover', transfer)

		expect(data).toEqual([['text/plain', '']])
		expect(transfer.effectAllowed).toBe('move')
		expect(transfer.dropEffect).toBe('move')
	})

	it('взятый элемент помечен классом на время жеста', async () => {
		const { items, nodeOf, drag } = await activated()
		const ends: unknown[] = []

		drag.events.on('drag:end', () => ends.push(true))

		fire(nodeOf(items[0]), 'dragstart')

		expect(items[0].classes.has('so-drag-and-drop__item', false)).toBe(true)

		fire(nodeOf(items[0]), 'dragend')

		expect(items[0].classes.has('so-drag-and-drop__item', false)).toBe(false)
		expect(ends).toEqual([true])
	})
})

/**
 * Касание пальцем — у узла, а не у корня: событие всплывает до корня, как у
 * браузера. Палец один (`pointerId` 1), основной.
 */
function touch(node: Element, type: string, x = 0, y = 0): PointerEvent {
	const event = new PointerEvent(type, {
		bubbles: true,
		cancelable: true,
		clientX: x,
		clientY: y,
		pointerId: 1,
		pointerType: 'touch',
		isPrimary: true,
	})

	node.dispatchEvent(event)

	return event
}

/**
 * Узел под пальцем — точкой документа (`elementFromPoint`): касание браузер
 * захватывает за узлом, где оно началось, и цель событий его хода — этот узел.
 * В jsdom раскладки нет, и точку тест отдаёт сам.
 */
function under(node: Element | null): void {
	Object.defineProperty(document, 'elementFromPoint', { value: () => node, configurable: true })
}

describe('TDragPlugin — пальцем: долгое нажатие берёт элемент', () => {
	afterEach(() => {
		vi.useRealTimers()
	})

	it('палец, державший элемент, переносит его на место третьего: move, drag:start и drag:end', async () => {
		const { engine, items, nodeOf, drag, moved } = await activated()
		const events: string[] = []

		vi.useFakeTimers()
		drag.events.on('drag:start', () => events.push('start'))
		drag.events.on('drag:end', () => events.push('end'))

		touch(nodeOf(items[0]), 'pointerdown')
		vi.advanceTimersByTime(450)

		expect(events).toEqual(['start'])
		expect(items[0].classes.has('so-drag-and-drop__item', false)).toBe(true)

		under(nodeOf(items[2]))
		touch(nodeOf(items[0]), 'pointermove', 0, 80)
		touch(nodeOf(items[0]), 'pointerup', 0, 80)

		expect(order(engine.extensions.batch.items)).toEqual(['b', 'c', 'a'])
		expect(moved.map(({ oldIndex, newIndex }) => [oldIndex, newIndex])).toEqual([[0, 2]])
		expect(events).toEqual(['start', 'end'])
		expect(items[0].classes.has('so-drag-and-drop__item', false)).toBe(false)
	})

	it('палец, ушедший за порог до долгого нажатия, — прокрутка: жеста нет, страница не держится', async () => {
		const { engine, items, nodeOf, drag, asked } = await activated()
		const starts: unknown[] = []

		vi.useFakeTimers()
		drag.events.on('drag:start', (payload) => starts.push(payload))

		touch(nodeOf(items[0]), 'pointerdown')
		touch(nodeOf(items[0]), 'pointermove', 0, 20)
		vi.advanceTimersByTime(1000)

		const scroll = new Event('touchmove', { bubbles: true, cancelable: true })

		nodeOf(items[0]).dispatchEvent(scroll)
		under(nodeOf(items[2]))
		touch(nodeOf(items[0]), 'pointermove', 0, 80)

		expect(starts).toEqual([])
		expect(scroll.defaultPrevented).toBe(false)
		expect(asked).toEqual([])
		expect(order(engine.extensions.batch.items)).toEqual(['a', 'b', 'c'])
	})

	it('взятый элемент несут — прокрутка отменена; палец держит — меню и выделение браузера не начинаются', async () => {
		const { items, nodeOf } = await activated()
		const press = () => new Event('contextmenu', { bubbles: true, cancelable: true })

		vi.useFakeTimers()

		touch(nodeOf(items[0]), 'pointerdown')

		const menu = press()
		const select = new Event('selectstart', { bubbles: true, cancelable: true })

		nodeOf(items[0]).dispatchEvent(menu)
		nodeOf(items[0]).dispatchEvent(select)
		vi.advanceTimersByTime(450)

		const scroll = new Event('touchmove', { bubbles: true, cancelable: true })

		nodeOf(items[0]).dispatchEvent(scroll)

		expect(menu.defaultPrevented).toBe(true)
		expect(select.defaultPrevented).toBe(true)
		expect(scroll.defaultPrevented).toBe(true)

		touch(nodeOf(items[0]), 'pointerup')

		const after = press()

		nodeOf(items[0]).dispatchEvent(after)

		expect(after.defaultPrevented).toBe(false)
	})

	it('нативный dragstart под пальцем отменён: элемент берёт долгое нажатие, а не жест браузера', async () => {
		const { items, nodeOf, drag } = await activated()
		const starts: unknown[] = []

		vi.useFakeTimers()
		drag.events.on('drag:start', (payload) => starts.push(payload))

		touch(nodeOf(items[0]), 'pointerdown')

		expect(fire(nodeOf(items[0]), 'dragstart').defaultPrevented).toBe(true)
		expect(starts).toEqual([])
	})

	it('отнятый палец — жест кончился; выключенный элемент и мышь долгим нажатием не берутся', async () => {
		const { items, nodeOf, drag } = await activated()
		const events: string[] = []

		vi.useFakeTimers()
		drag.events.on('drag:start', () => events.push('start'))
		drag.events.on('drag:end', () => events.push('end'))

		touch(nodeOf(items[0]), 'pointerdown')
		vi.advanceTimersByTime(450)
		touch(nodeOf(items[0]), 'pointercancel')

		expect(events).toEqual(['start', 'end'])

		items[1].disabled = true
		touch(nodeOf(items[1]), 'pointerdown')
		vi.advanceTimersByTime(450)
		touch(nodeOf(items[1]), 'pointerup')

		nodeOf(items[2]).dispatchEvent(
			new PointerEvent('pointerdown', {
				bubbles: true,
				pointerType: 'mouse',
				isPrimary: true,
			}),
		)
		vi.advanceTimersByTime(450)

		expect(events).toEqual(['start', 'end'])
	})
})
