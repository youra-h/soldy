/**
 * DragAndDrop в Svelte — перестановка элементов Tabs, ListBox и Accordion жестом.
 *
 * Обёртка своего узла не рисует: её экземпляр подхватывают коллекции внутри
 * (`TDragAndDropCollectionExtension`) и включают им плагин перетаскивания —
 * узлы их элементов становятся `draggable`, а жест — командой обёртки. События
 * перестановки компонент отдаёт колбэками из дескриптора (`onMoveBefore`,
 * `onMove`), и отмена в обработчике оставляет элемент на месте. Список в
 * секции Accordion перестановку не наследует: коллекция опускает своему
 * поддереву пустое. Сценарии — те же, что у Vue, React и Solid
 * (`ui/vue/__tests__/drag-and-drop.spec.ts` и соседи); разметка — харнесс
 * `DragAndDrop.test.svelte`, сервер — `collections.server.spec.ts`.
 *
 * Своё у Svelte — сборка один раз, при инициализации компонента: экземпляр
 * обёртки коллекция читает из её контекста (лифт — `setContext`), и список,
 * снятый и смонтированный в обёртке заново, читает тот же.
 *
 * `DragEvent` в jsdom нет — жест подаётся событиями с теми же именами. Правила
 * команды — `core/__tests__/drag-and-drop.spec.ts`, жест —
 * `plugins/__tests__/collection-elements.plugin.spec.ts`, настоящее
 * перетаскивание в браузере — `playground/vue/browser/drag-and-drop.spec.ts`.
 */

import { describe, it, expect } from 'vitest'
import { flushSync } from 'svelte'
import type { IDragAndDropMove, TDragAndDropMoveEvent } from '@soldy-ui/core'
import Wrapped from './DragAndDrop.test.svelte'
import { mount, nextFrame } from './mount'
import { reactiveProps } from './reactive-props.svelte'

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
function fire(node: Element, type: string): void {
	node.dispatchEvent(new Event(type, { bubbles: true, cancelable: true }))
	flushSync()
}

/** Перетащить элемент списка на место другого: взяли, понесли над ним, отпустили. */
async function dragOnto(from: number, to: number): Promise<void> {
	const items = nodes('.so-list-box-item')

	fire(items[from], 'dragstart')
	fire(items[to], 'dragover')
	fire(items[to], 'drop')
	fire(items[from], 'dragend')

	await nextFrame()
}

/** Места перестановок: до неё и после. */
const places = (events: readonly IDragAndDropMove[]) =>
	events.map(({ oldIndex, newIndex }) => [oldIndex, newIndex])

describe('DragAndDrop: коллекции внутри', () => {
	it('элементы Tabs, ListBox и Accordion в обёртке — перетаскиваемые', async () => {
		mount(Wrapped, {})

		// Узлы элементов плагин узнаёт по `ready` — через кадр
		await nextFrame()

		expect(draggable('.so-tabs-item')).toEqual(['true', 'true', 'true'])
		expect(draggable('.so-list-box-item')).toEqual(['true', 'true', 'true'])
		expect(draggable('.so-accordion-item')).toEqual(['true', 'true', 'true'])
	})

	it('без обёртки элементы не перетаскиваются', async () => {
		mount(Wrapped, { wrapped: false })

		await nextFrame()

		expect(draggable('.so-tabs-item')).toEqual([null, null, null])
		expect(draggable('.so-list-box-item')).toEqual([null, null, null])
		expect(draggable('.so-accordion-item')).toEqual([null, null, null])
	})

	it('список в секции Accordion перестановку не наследует', async () => {
		mount(Wrapped, { kind: 'nested' })

		await nextFrame()

		expect(draggable('.so-accordion-item')).toEqual(['true'])
		expect(draggable('.so-list-box-item')).toEqual([null, null, null])
	})
})

describe('DragAndDrop: события перестановки', () => {
	it('жест переставляет элемент: onMoveBefore, затем onMove — с местом, где он встал', async () => {
		const before: TDragAndDropMoveEvent[] = []
		const moved: IDragAndDropMove[] = []

		mount(Wrapped, {
			kind: 'list',
			dragAndDrop: {
				onMoveBefore: (e: TDragAndDropMoveEvent) => before.push(e),
				onMove: (e: IDragAndDropMove) => moved.push(e),
			},
		})

		await nextFrame()
		await dragOnto(0, 2)

		expect(screenOrder()).toEqual(['B', 'C', 'A'])
		expect(places(before)).toEqual([[0, 2]])
		expect(places(moved)).toEqual([[0, 2]])
		expect(moved[0].item).toBe(before[0].item)
		expect(moved[0].engine).toBe(before[0].engine)
	})

	it('preventDefault() в обработчике onMoveBefore оставляет элемент на месте', async () => {
		const moved: IDragAndDropMove[] = []

		mount(Wrapped, {
			kind: 'list',
			dragAndDrop: {
				onMoveBefore: (e: TDragAndDropMoveEvent) => e.preventDefault(),
				onMove: (e: IDragAndDropMove) => moved.push(e),
			},
		})

		await nextFrame()
		await dragOnto(0, 2)

		expect(screenOrder()).toEqual(['A', 'B', 'C'])
		expect(moved).toEqual([])
	})
})

describe('DragAndDrop: цикл Svelte', () => {
	/**
	 * Контекст обёртки живёт с ней, а не со списком: список, снятый и
	 * смонтированный заново, при своей инициализации читает тот же экземпляр и
	 * переставляет командой той же обёртки.
	 */
	it('список, смонтированный в обёртке заново, — снова перетаскиваемый', async () => {
		const moved: IDragAndDropMove[] = []
		const props = reactiveProps({
			kind: 'list' as const,
			listed: true,
			dragAndDrop: { onMove: (e: IDragAndDropMove) => moved.push(e) },
		})

		mount(Wrapped, props)
		await nextFrame()

		props.listed = false
		flushSync()

		expect(nodes('.so-list-box-item')).toEqual([])

		props.listed = true
		flushSync()
		await nextFrame()

		expect(draggable('.so-list-box-item')).toEqual(['true', 'true', 'true'])

		await dragOnto(0, 2)

		expect(screenOrder()).toEqual(['B', 'C', 'A'])
		expect(places(moved)).toEqual([[0, 2]])
	})
})
