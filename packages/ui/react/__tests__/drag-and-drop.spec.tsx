/**
 * DragAndDrop в React — перестановка элементов Tabs, ListBox и Accordion жестом.
 *
 * Обёртка своего узла не рисует: её экземпляр подхватывают коллекции внутри
 * (`TDragAndDropCollectionExtension`) и включают им плагин перетаскивания —
 * узлы их элементов становятся `draggable`, а жест — командой обёртки. События
 * перестановки компонент отдаёт колбэками из дескриптора (`onMoveBefore`,
 * `onMove`), и отмена в обработчике оставляет элемент на месте. Список в
 * секции Accordion перестановку не наследует: коллекция опускает своему
 * поддереву пустое. Сценарии — те же, что у Vue
 * (`ui/vue/__tests__/drag-and-drop.spec.ts`).
 *
 * Своё у React — сборка на рендере и приём при коммите. Пересобранная обёртка
 * (StrictMode) опускает новый экземпляр, и список пересобирается вслед за ней:
 * жест после лишнего цикла эффектов даёт ровно одно `onMove`. Сервер узлов не
 * знает, и `draggable` в его разметке нет: его ставит плагин, когда узел
 * гидратированного элемента объявлен. Что выброшенный рендер ничего не
 * оставляет на `ctrl` обёртки и движке, сторожит `external-lifetime.spec.tsx`.
 *
 * `DragEvent` в jsdom нет — жест подаётся событиями с теми же именами. Правила
 * команды — `core/__tests__/drag-and-drop.spec.ts`, жест —
 * `plugins/__tests__/collection-elements.plugin.spec.ts`, настоящее
 * перетаскивание в браузере — `playground/vue/browser/drag-and-drop.spec.ts`.
 */

import { describe, it, expect, vi } from 'vitest'
import { StrictMode, act, type ReactElement } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import type { IDragAndDropMove, TDragAndDropMoveEvent } from '@soldy-ui/core'
import { Accordion, DragAndDrop, ListBox, Tabs } from '@soldy-ui/react'
import { mount, nextFrame, track } from './mount'

const ITEMS = ['a', 'b', 'c'].map((value) => ({ value, text: value.toUpperCase() }))

/** Три коллекции: табы и секции — разметкой, список — данными. */
const collections = () => (
	<>
		<Tabs>
			{ITEMS.map((item, index) => (
				<Tabs.Item key={item.value} active={index === 0} {...item} />
			))}
		</Tabs>
		<ListBox items={ITEMS} aria_label="Пункты" />
		<Accordion>
			{ITEMS.map((item) => (
				<Accordion.Item key={item.value} {...item}>
					Содержимое {item.text}
				</Accordion.Item>
			))}
		</Accordion>
	</>
)

/** Узлы элементов коллекции по классу корня элемента. */
const nodes = (selector: string, root: ParentNode = document) => [
	...root.querySelectorAll<HTMLElement>(selector),
]

/** Перетаскиваемость узлов элементов: `draggable` каждого. */
const draggable = (selector: string, root: ParentNode = document) =>
	nodes(selector, root).map((node) => node.getAttribute('draggable'))

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
	act(() => {
		node.dispatchEvent(new Event(type, { bubbles: true, cancelable: true }))
	})
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

/** Перестановки, о которых сообщила обёртка, — оба события по порядку. */
function moves() {
	const before: TDragAndDropMoveEvent[] = []
	const moved: IDragAndDropMove[] = []

	return {
		before,
		moved,
		onMoveBefore: (e: TDragAndDropMoveEvent) => before.push(e),
		onMove: (e: IDragAndDropMove) => moved.push(e),
		/** Места перестановок: до неё и после. */
		places: (events: readonly IDragAndDropMove[]) =>
			events.map(({ oldIndex, newIndex }) => [oldIndex, newIndex]),
	}
}

describe('DragAndDrop: коллекции внутри', () => {
	it('элементы Tabs, ListBox и Accordion в обёртке — перетаскиваемые', async () => {
		mount(<DragAndDrop>{collections()}</DragAndDrop>)

		// Узлы элементов плагин узнаёт по `ready` — через кадр
		await nextFrame()

		expect(draggable('.so-tabs-item')).toEqual(['true', 'true', 'true'])
		expect(draggable('.so-list-box-item')).toEqual(['true', 'true', 'true'])
		expect(draggable('.so-accordion-item')).toEqual(['true', 'true', 'true'])
	})

	it('без обёртки элементы не перетаскиваются', async () => {
		mount(<div>{collections()}</div>)

		await nextFrame()

		expect(draggable('.so-tabs-item')).toEqual([null, null, null])
		expect(draggable('.so-list-box-item')).toEqual([null, null, null])
		expect(draggable('.so-accordion-item')).toEqual([null, null, null])
	})

	it('список в секции Accordion перестановку не наследует', async () => {
		mount(
			<DragAndDrop>
				<Accordion>
					<Accordion.Item value="a" text="A">
						<ListBox items={ITEMS} aria_label="Пункты" />
					</Accordion.Item>
				</Accordion>
			</DragAndDrop>,
		)

		await nextFrame()

		expect(draggable('.so-accordion-item')).toEqual(['true'])
		expect(draggable('.so-list-box-item')).toEqual([null, null, null])
	})
})

describe('DragAndDrop: события перестановки', () => {
	it('жест переставляет элемент: onMoveBefore, затем onMove — с местом, где он встал', async () => {
		const probe = moves()

		mount(
			<DragAndDrop onMoveBefore={probe.onMoveBefore} onMove={probe.onMove}>
				<ListBox items={ITEMS} aria_label="Пункты" />
			</DragAndDrop>,
		)

		await nextFrame()
		await dragOnto(0, 2)

		expect(screenOrder()).toEqual(['B', 'C', 'A'])
		expect(probe.places(probe.before)).toEqual([[0, 2]])
		expect(probe.places(probe.moved)).toEqual([[0, 2]])
		expect(probe.moved[0].item).toBe(probe.before[0].item)
		expect(probe.moved[0].engine).toBe(probe.before[0].engine)
	})

	it('preventDefault() в обработчике onMoveBefore оставляет элемент на месте', async () => {
		const probe = moves()

		mount(
			<DragAndDrop onMoveBefore={(e) => e.preventDefault()} onMove={probe.onMove}>
				<ListBox items={ITEMS} aria_label="Пункты" />
			</DragAndDrop>,
		)

		await nextFrame()
		await dragOnto(0, 2)

		expect(screenOrder()).toEqual(['A', 'B', 'C'])
		expect(probe.moved).toEqual([])
	})
})

describe('DragAndDrop: цикл React', () => {
	/**
	 * StrictMode уничтожает контексты и собирает их заново. Пересобранная
	 * обёртка — новый экземпляр: список видит, что прочитанное из лифта
	 * сменилось, пересобирается и переставляет командой живой обёртки, а не
	 * уничтоженной. Жест — одна пара событий, а не две.
	 */
	it('StrictMode: после лишнего цикла эффектов жест даёт ровно одно onMove', async () => {
		const probe = moves()

		mount(
			<StrictMode>
				<DragAndDrop onMoveBefore={probe.onMoveBefore} onMove={probe.onMove}>
					<ListBox items={ITEMS} aria_label="Пункты" />
				</DragAndDrop>
			</StrictMode>,
		)

		await nextFrame()

		expect(draggable('.so-list-box-item')).toEqual(['true', 'true', 'true'])

		await dragOnto(0, 2)

		expect(screenOrder()).toEqual(['B', 'C', 'A'])
		expect(probe.places(probe.before)).toEqual([[0, 2]])
		expect(probe.places(probe.moved)).toEqual([[0, 2]])
	})

	/**
	 * Узлов на сервере нет, и плагину перетаскивания нечего помечать: в
	 * разметке сервера `draggable` нет. Браузер собирает те же коллекции в той же
	 * обёртке, гидратация сходится, а `draggable` ставит плагин, когда узлы
	 * объявлены.
	 */
	it('сервер — без draggable, после гидратации — перетаскиваемые, гидратация сходится', async () => {
		const element: ReactElement = <DragAndDrop>{collections()}</DragAndDrop>
		const container = document.createElement('div')
		const onRecoverableError = vi.fn()

		container.innerHTML = renderToString(element)

		expect(nodes('.so-list-box-item', container)).toHaveLength(3)
		expect(nodes('[draggable]', container)).toEqual([])

		document.body.append(container)

		act(() => {
			track(hydrateRoot(container, element, { onRecoverableError }))
		})

		await nextFrame()

		expect(onRecoverableError).not.toHaveBeenCalled()
		expect(draggable('.so-tabs-item', container)).toEqual(['true', 'true', 'true'])
		expect(draggable('.so-list-box-item', container)).toEqual(['true', 'true', 'true'])
		expect(draggable('.so-accordion-item', container)).toEqual(['true', 'true', 'true'])
	})
})
