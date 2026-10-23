/**
 * DragAndDrop под Web Components — `<so-drag-and-drop>` вокруг Tabs, ListBox и
 * Accordion на настоящей разметке.
 *
 * Экземпляр обёртки подхватывают коллекции в её свете
 * (`TDragAndDropCollectionExtension`) и включают им плагин перетаскивания —
 * узлы их элементов становятся `draggable`, а жест — командой обёртки. О
 * перестановке обёртка сообщает событиями элемента в именах адаптера —
 * `so:move:before` и `so:move`, аргумент события ядра — в `detail`, и
 * `preventDefault()` события оставляет элемент на месте. Список в секции
 * Accordion перестановку не наследует: коллекция опускает своему поддереву
 * пустое. Сценарии — те же, что у Vue, React, Solid, Svelte и Angular
 * (`ui/vue/__tests__/drag-and-drop.spec.ts` и соседи), без StrictMode и
 * сервера.
 *
 * Своё у Web Components — элемент. У остальных адаптеров у обёртки узла нет, а
 * здесь он есть: автономный `<so-drag-and-drop>` без своей коробки, и
 * коллекции стоят в нём светом. Экземпляр его сборка опускает лифтом своему
 * хосту, а коллекция, собираясь следом, находит его вверх по документу. Связка
 * у элемента новая на каждое подключение: список, вынутый из обёртки,
 * собирается заново без неё, а вставленный обратно — снова в ней.
 *
 * `DragEvent` в jsdom нет — жест подаётся событиями с теми же именами. Правила
 * команды — `core/__tests__/drag-and-drop.spec.ts`, жест —
 * `plugins/__tests__/collection-elements.plugin.spec.ts`, настоящее
 * перетаскивание в браузере — `playground/vue/browser/drag-and-drop.spec.ts`.
 */

import { describe, it, expect, expectTypeOf, afterEach } from 'vitest'
import { TDragAndDropMoveEvent } from '@soldy-ui/core'
import type { IDragAndDrop, IDragAndDropMove } from '@soldy-ui/core'
import { DragAndDropDescriptor } from '@soldy-ui/setup'
import {
	TDragAndDropElement,
	TListBoxElement,
	type TDragAndDropElementProps,
	type TListBoxElementProps,
} from '@soldy-ui/webc'
import { dragAndDropTemplate } from '../src/components/drag-and-drop/drag-and-drop.template'
import { bareContext } from './template-context'

/** Отрисовка коалесцируется в микротаске — ждём её перед проверкой. */
const flush = () => new Promise<void>((resolve) => queueMicrotask(() => resolve()))

/** Отрисовка цепочкой: смена в ядре перерисовывает коллекцию, а та — свои элементы. */
async function settle(): Promise<void> {
	for (let turn = 0; turn < 4; turn++) await flush()
}

/** `TElementPlugin` объявляет узел через кадр — по нему плагин помечает узлы элементов. */
async function nextFrame(): Promise<void> {
	await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
	await settle()
}

afterEach(() => {
	document.body.innerHTML = ''
})

function isDragAndDrop(node: Element | null): node is TDragAndDropElementProps {
	return node instanceof TDragAndDropElement
}

function isList(node: Element | null): node is TListBoxElementProps {
	return node instanceof TListBoxElement
}

/** Аргумент `so:move` — перестановка с местами, взятым элементом и коллекцией. */
function isMove(value: unknown): value is IDragAndDropMove {
	return (
		typeof value === 'object' &&
		value !== null &&
		'engine' in value &&
		'item' in value &&
		'oldIndex' in value &&
		'newIndex' in value
	)
}

const ITEMS = ['a', 'b', 'c'].map((value) => ({ value, text: value.toUpperCase() }))

/** Табы и секции — разметкой на одном составе. */
const TABS = `<div is="so-tabs">
	<div is="so-tabs-item" value="a" text="A" active></div>
	<div is="so-tabs-item" value="b" text="B"></div>
	<div is="so-tabs-item" value="c" text="C"></div>
</div>`

const ACCORDION = `<div is="so-accordion">
	<div is="so-accordion-item" value="a" text="A">Содержимое A</div>
	<div is="so-accordion-item" value="b" text="B">Содержимое B</div>
	<div is="so-accordion-item" value="c" text="C">Содержимое C</div>
</div>`

/** Обёртка `<so-drag-and-drop>` кодом. */
function createDragAndDrop(): TDragAndDropElementProps {
	const el = document.createElement('so-drag-and-drop')

	if (!isDragAndDrop(el)) throw new Error('<so-drag-and-drop> нет')

	return el
}

/** Список кодом: состав — свойством до вставки. */
function createList(): TListBoxElementProps {
	const el = document.createElement('div', { is: 'so-list-box' })

	if (!isList(el)) throw new Error('<div is="so-list-box"> нет')

	el.items = ITEMS
	el.aria_label = 'Пункты'

	return el
}

/** Три коллекции в узле: табы и секции — разметкой, список — данными, между ними. */
function fill(parent: Element): TListBoxElementProps {
	const list = createList()

	parent.innerHTML = `${TABS}${ACCORDION}`
	parent.insertBefore(list, parent.lastElementChild)

	return list
}

/** Коллекции в обёртке — одной вставкой, как разметка страницы; кадр — узлы плагинам. */
async function inWrapper(content: (wrapper: Element) => void = fill) {
	const wrapper = createDragAndDrop()

	content(wrapper)
	document.body.appendChild(wrapper)
	await nextFrame()

	return wrapper
}

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
		await inWrapper()

		expect(draggable('.so-tabs-item')).toEqual(['true', 'true', 'true'])
		expect(draggable('.so-list-box-item')).toEqual(['true', 'true', 'true'])
		expect(draggable('.so-accordion-item')).toEqual(['true', 'true', 'true'])
	})

	it('без обёртки элементы не перетаскиваются', async () => {
		fill(document.body.appendChild(document.createElement('div')))
		await nextFrame()

		expect(draggable('.so-tabs-item')).toEqual([null, null, null])
		expect(draggable('.so-list-box-item')).toEqual([null, null, null])
		expect(draggable('.so-accordion-item')).toEqual([null, null, null])
	})

	it('список в секции Accordion перестановку не наследует', async () => {
		await inWrapper((wrapper) => {
			wrapper.innerHTML = `<div is="so-accordion">
				<div is="so-accordion-item" value="a" text="A"></div>
			</div>`
			wrapper.querySelector('[is="so-accordion-item"]')?.appendChild(createList())
		})

		expect(draggable('.so-accordion-item')).toEqual(['true'])
		expect(draggable('.so-list-box-item')).toEqual([null, null, null])
	})
})

describe('DragAndDrop: события перестановки', () => {
	/** Перестановки, о которых сообщила обёртка, — `detail` её событий. */
	function listen(wrapper: Element, cancel = false) {
		const before: TDragAndDropMoveEvent[] = []
		const moved: IDragAndDropMove[] = []

		wrapper.addEventListener('so:move:before', (event) => {
			if (
				!(event instanceof CustomEvent) ||
				!(event.detail instanceof TDragAndDropMoveEvent)
			) {
				return
			}

			before.push(event.detail)

			if (cancel) event.preventDefault()
		})
		wrapper.addEventListener('so:move', (event) => {
			if (event instanceof CustomEvent && isMove(event.detail)) moved.push(event.detail)
		})

		return { before, moved }
	}

	it('жест переставляет элемент: so:move:before, затем so:move — с местом, где он встал', async () => {
		const wrapper = await inWrapper((node) => node.appendChild(createList()))
		const { before, moved } = listen(wrapper)

		await dragOnto(0, 2)

		expect(screenOrder()).toEqual(['B', 'C', 'A'])
		expect(places(before)).toEqual([[0, 2]])
		expect(places(moved)).toEqual([[0, 2]])
		expect(moved[0].item).toBe(before[0].item)
		expect(moved[0].engine).toBe(before[0].engine)
	})

	it('preventDefault() события so:move:before оставляет элемент на месте', async () => {
		const wrapper = await inWrapper((node) => node.appendChild(createList()))
		const { before, moved } = listen(wrapper, true)

		await dragOnto(0, 2)

		expect(screenOrder()).toEqual(['A', 'B', 'C'])
		expect(places(before)).toEqual([[0, 2]])
		expect(moved).toEqual([])
	})
})

describe('DragAndDrop: элемент Web Components', () => {
	/**
	 * Своего узла у обёртки в остальных адаптерах нет, а у `<so-drag-and-drop>`
	 * есть — без коробки: теневой корень несёт только `<slot>` и `:host {
	 * display: contents }`, и коллекции остаются его светом.
	 */
	it('<so-drag-and-drop> — автономный элемент без коробки, коллекции — его свет', async () => {
		const wrapper = await inWrapper()
		const shadow = wrapper.shadowRoot

		expect(customElements.get('so-drag-and-drop')).toBe(TDragAndDropElement)
		expect(wrapper.localName).toBe('so-drag-and-drop')
		expect(wrapper.hasAttribute('is')).toBe(false)
		expect(
			[...wrapper.children].map((child) =>
				['so-tabs', 'so-list-box', 'so-accordion'].find((block) =>
					child.classList.contains(block),
				),
			),
		).toEqual(['so-tabs', 'so-list-box', 'so-accordion'])
		expect(shadow?.querySelector('style')?.textContent).toContain('display: contents')
		expect(shadow?.querySelector('slot')).not.toBeNull()
		// Невизуальный компонент: ни классов, ни наборов база на него не кладёт
		expect(wrapper.getAttributeNames()).toEqual([])
	})

	/** Разметка страницы: обёртка и коллекции в ней — одной вставкой `innerHTML`. */
	it('обёртка в разметке — коллекции в ней перетаскиваемые', async () => {
		const host = document.createElement('div')

		host.innerHTML = `<so-drag-and-drop>${TABS}${ACCORDION}</so-drag-and-drop>`
		document.body.appendChild(host)
		await nextFrame()

		expect(draggable('.so-tabs-item')).toEqual(['true', 'true', 'true'])
		expect(draggable('.so-accordion-item')).toEqual(['true', 'true', 'true'])
	})

	/**
	 * Список, переставленный из обёртки, собирается заново — уже без обёртки над
	 * собой, и его элементы не перетаскиваются. Вставленный обратно — снова в
	 * ней.
	 */
	it('список, вынутый из обёртки, перестановку теряет; вставленный обратно — снова в ней', async () => {
		const list = createList()
		const wrapper = await inWrapper((node) => node.appendChild(list))

		expect(draggable('.so-list-box-item')).toEqual(['true', 'true', 'true'])

		document.body.appendChild(list)
		await nextFrame()

		expect(draggable('.so-list-box-item')).toEqual([null, null, null])

		wrapper.appendChild(list)
		await nextFrame()

		expect(draggable('.so-list-box-item')).toEqual(['true', 'true', 'true'])
	})
})

describe('шаблон объявляет ровно те слоты, что и дескриптор', () => {
	it('DragAndDrop', () => {
		const root = document.createElement('so-drag-and-drop')
		const targets = dragAndDropTemplate.create(root, bareContext(root)).slots

		expect(Object.keys(targets).sort()).toEqual(
			DragAndDropDescriptor()
				.slots.map((slot) => slot.name)
				.sort(),
		)
	})
})

describe('типы', () => {
	it('обёртка — элемент HTML со своим экземпляром ядра', () => {
		expectTypeOf<TDragAndDropElementProps>().toExtend<HTMLElement>()
		expectTypeOf<TDragAndDropElementProps['ctrl']>().toEqualTypeOf<IDragAndDrop | undefined>()
	})
})
