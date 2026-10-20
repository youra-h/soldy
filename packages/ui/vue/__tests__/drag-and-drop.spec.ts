/**
 * DragAndDrop во Vue — перестановка элементов Tabs, ListBox и Accordion жестом.
 *
 * Обёртка своего узла не рисует: её экземпляр подхватывают коллекции внутри
 * (`TDragAndDropCollectionExtension`) и включают им плагин перетаскивания —
 * узлы их элементов становятся `draggable`, а жест — командой обёртки. События
 * перестановки компонент отдаёт из дескриптора (`@move:before`, `@move`), и
 * отмена в обработчике оставляет элемент на месте. Список в секции Accordion
 * перестановку не наследует: коллекция опускает своему поддереву пустое.
 *
 * `DragEvent` в jsdom нет — жест подаётся событиями с теми же именами. Правила
 * команды — `core/__tests__/drag-and-drop.spec.ts`, жест —
 * `plugins/__tests__/collection-elements.plugin.spec.ts`, настоящее
 * перетаскивание в браузере — `playground/vue/browser/drag-and-drop.spec.ts`.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, type VNode } from 'vue'
import { Accordion, DragAndDrop, ListBox, Tabs } from '@soldy-ui/vue'
import type { IDragAndDropMove, TDragAndDropMoveEvent } from '@soldy-ui/core'

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

let wrapper: ReturnType<typeof mount> | null = null

afterEach(() => {
	wrapper?.unmount()
	wrapper = null
	document.body.innerHTML = ''
})

/** Смонтировать разметку в документ и дождаться кадра: корень плагины получают через кадр. */
async function render(content: () => VNode): Promise<void> {
	wrapper = mount(defineComponent({ render: content }), { attachTo: document.body })

	await settle()
}

async function settle(): Promise<void> {
	await nextTick()
	await nextFrame()
}

const ITEMS = ['a', 'b', 'c'].map((value) => ({ value, text: value.toUpperCase() }))

/** Три коллекции: табы и секции — разметкой, список — данными. */
const collections = () => [
	h(Tabs, null, () =>
		ITEMS.map((item, index) => h(Tabs.Item, { key: item.value, active: index === 0, ...item })),
	),
	h(ListBox, { items: ITEMS, aria_label: 'Пункты' }),
	h(Accordion, null, () =>
		ITEMS.map((item) =>
			h(Accordion.Item, { key: item.value, ...item }, () => `Содержимое ${item.text}`),
		),
	),
]

/** Узлы элементов коллекции по классу корня элемента. */
const nodes = (selector: string) => [...document.querySelectorAll<HTMLElement>(selector)]

/** Перетаскиваемость узлов элементов: `draggable` каждого. */
const draggable = (selector: string) =>
	nodes(selector).map((node) => node.getAttribute('draggable'))

/**
 * Тексты строк элементов списка — в порядке на экране: элементы стоят флексом
 * по месту в составе (`order`).
 */
function screenOrder(): string[] {
	return nodes('.so-list-box-item')
		.map((node) => ({ text: node.textContent?.trim() ?? '', order: Number(node.style.order) }))
		.sort((first, second) => first.order - second.order)
		.map(({ text }) => text)
}

/** Событие жеста на узле — всплывает и отменяется, как у браузера. */
function fire(node: Element, type: string): Event {
	const event = new Event(type, { bubbles: true, cancelable: true })

	node.dispatchEvent(event)

	return event
}

/** Перетащить элемент списка на место другого: взяли, понесли над ним, отпустили. */
async function dragOnto(from: number, to: number): Promise<void> {
	const items = nodes('.so-list-box-item')

	fire(items[from], 'dragstart')
	fire(items[to], 'dragover')
	fire(items[to], 'drop')
	fire(items[from], 'dragend')

	await settle()
}

describe('DragAndDrop: коллекции внутри', () => {
	it('элементы Tabs, ListBox и Accordion в обёртке — перетаскиваемые', async () => {
		await render(() => h(DragAndDrop, null, collections))

		expect(draggable('.so-tabs-item')).toEqual(['true', 'true', 'true'])
		expect(draggable('.so-list-box-item')).toEqual(['true', 'true', 'true'])
		expect(draggable('.so-accordion-item')).toEqual(['true', 'true', 'true'])
	})

	it('без обёртки элементы не перетаскиваются', async () => {
		await render(() => h('div', null, collections()))

		expect(draggable('.so-tabs-item')).toEqual([null, null, null])
		expect(draggable('.so-list-box-item')).toEqual([null, null, null])
		expect(draggable('.so-accordion-item')).toEqual([null, null, null])
	})

	it('список в секции Accordion перестановку не наследует', async () => {
		await render(() =>
			h(DragAndDrop, null, () =>
				h(Accordion, null, () =>
					h(Accordion.Item, { value: 'a', text: 'A' }, () =>
						h(ListBox, { items: ITEMS, aria_label: 'Пункты' }),
					),
				),
			),
		)

		expect(draggable('.so-accordion-item')).toEqual(['true'])
		expect(draggable('.so-list-box-item')).toEqual([null, null, null])
	})
})

describe('DragAndDrop: события перестановки', () => {
	it('жест переставляет элемент: move:before, затем move — с местом, где он встал', async () => {
		const before: TDragAndDropMoveEvent[] = []
		const moved: IDragAndDropMove[] = []

		await render(() =>
			h(
				DragAndDrop,
				{
					'onMove:before': (e: TDragAndDropMoveEvent) => before.push(e),
					onMove: (e: IDragAndDropMove) => moved.push(e),
				},
				() => h(ListBox, { items: ITEMS, aria_label: 'Пункты' }),
			),
		)

		await dragOnto(0, 2)

		expect(screenOrder()).toEqual(['B', 'C', 'A'])
		expect(before.map(({ oldIndex, newIndex }) => [oldIndex, newIndex])).toEqual([[0, 2]])
		expect(moved.map(({ oldIndex, newIndex }) => [oldIndex, newIndex])).toEqual([[0, 2]])
		expect(moved[0].item).toBe(before[0].item)
		expect(moved[0].engine).toBe(before[0].engine)
	})

	it('preventDefault() в обработчике move:before оставляет элемент на месте', async () => {
		const moved: IDragAndDropMove[] = []

		await render(() =>
			h(
				DragAndDrop,
				{
					'onMove:before': (e: TDragAndDropMoveEvent) => e.preventDefault(),
					onMove: (e: IDragAndDropMove) => moved.push(e),
				},
				() => h(ListBox, { items: ITEMS, aria_label: 'Пункты' }),
			),
		)

		await dragOnto(0, 2)

		expect(screenOrder()).toEqual(['A', 'B', 'C'])
		expect(moved).toEqual([])
	})
})
