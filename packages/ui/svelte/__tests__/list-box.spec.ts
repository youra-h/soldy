/**
 * ListBox in Svelte, the adapter's first collection.
 *
 * The collection engine, its extensions and plugins are shared unchanged, and
 * these tests check that the core's mechanics are not written for Vue and
 * React. The scenarios are React's (`list-box.spec.tsx`): selection,
 * composition, the indicator and slots.
 *
 * What is Svelte's own is when an item joins the collection: at the
 * component's initialisation (the context's `attach` in `useAdapter`), as in
 * Vue. The elevator is a Svelte context (the list's `setContext`), covered by
 * `collection-elevator.spec.ts`.
 *
 * And slots. A snippet is opaque: the item cannot see what it drew, so a
 * given slot is drawn in every item instead of the item's own, even where the
 * snippet drew nothing. In React and Vue an empty slot gives way to the own
 * content.
 */

import { describe, it, expect, expectTypeOf, vi, afterEach } from 'vitest'
import { flushSync, type ComponentProps, type Snippet } from 'svelte'
import {
	createEngine,
	createEngineListBox,
	type IListBoxItem,
	type TListBoxCollection,
	type TListBoxValue,
} from '@soldy-ui/core'
import {
	ListBox,
	ListBoxGroup,
	ListBoxItem,
	type ListBoxItemProps,
	type ListBoxProps,
} from '@soldy-ui/svelte'
import Harness from './ListBox.test.svelte'
import Groups from './ListBoxGroups.test.svelte'
import Slots from './ListBoxSlots.test.svelte'
import { find, mount, nextFrame } from './mount'
import { reactiveProps } from './reactive-props.svelte'
import { markup, scopeMarkup, scopeText } from './snippets.svelte'

afterEach(() => {
	vi.restoreAllMocks()
})

type TItem = { value: string; text: string }

const ITEMS: TItem[] = [
	{ value: 'a', text: 'Первый' },
	{ value: 'b', text: 'Второй' },
	{ value: 'c', text: 'Третий' },
]

/** The item rows: they carry the selection handler, `aria-selected` and `tabindex`. */
const rows = () => [...document.querySelectorAll('.so-list-box-item .so-button')]

/** An item's row by its text; without one the test fails here. */
function rowOf(text: string): HTMLElement {
	const row = rows().find((candidate) => candidate.textContent?.trim() === text)

	if (!(row instanceof HTMLElement)) throw new Error(`строки элемента «${text}» нет`)

	return row
}

/** `aria-selected` of all rows in order. */
const selection = () => rows().map((row) => row.getAttribute('aria-selected'))

const listItems = () => [...document.querySelectorAll('.so-list-box-item')]

/** The list node inside the root: it carries the list's `aria` set and the Tab stop. */
const list = () => find(document, '.so-list-box > .so-list-box__list', HTMLElement)

/** Non-empty text nodes directly in the node: whitespace between parts of the markup. */
const strayText = (node: Node) =>
	[...node.childNodes].filter(
		(child) => child.nodeType === Node.TEXT_NODE && child.textContent !== '',
	)

function click(element: HTMLElement): void {
	element.click()
	flushSync()
}

/** A key on a node as the browser sends it: bubbling and cancelable. */
function press(target: Element, key: string): void {
	target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
	flushSync()
}

/** Microtasks: the engine announces `engine:create` on them. */
async function flush(): Promise<void> {
	await Promise.resolve()
	flushSync()
}

/** Slot scopes: of the item's row, of the row's relay and of a relay without its own scope. */
type TRowScope = { text: string; selected: boolean }
type TItemRowScope = TRowScope & { item: IListBoxItem }
type TItemScope = { item: IListBoxItem }

/** The engine as the test sees it: the item composition. */
type TEngineView = { extensions: { batch: { items: readonly object[] } } }

const valuesOf = (engine: TEngineView | undefined) =>
	engine?.extensions.batch.items.map((item) => Reflect.get(item, 'value'))

type THarnessProps = ComponentProps<typeof Harness>

/** "B" is disabled by `itemOff`, the whole list by `listOff`. */
function harness({
	itemOff = false,
	listOff = false,
	...list
}: ListBoxProps & { itemOff?: boolean; listOff?: boolean } = {}): THarnessProps {
	return {
		list: { mode: 'multiple', disabled: listOff, ...list },
		items: [
			{ value: 'a', text: 'A' },
			{ value: 'b', text: 'B', disabled: itemOff },
		],
	}
}

describe('выбор', () => {
	it('элементы разметки входят в коллекцию в порядке DOM', async () => {
		const engines: TEngineView[] = []

		mount(Harness, {
			list: { onEngineCreate: (engine) => engines.push(engine) },
			items: [
				{ value: 'a', text: 'A' },
				{ value: 'b', text: 'B' },
				{ value: 'c', text: 'C' },
			],
		})
		await flush()

		expect(valuesOf(engines.at(-1))).toEqual(['a', 'b', 'c'])
	})

	it('клик по строке выбирает элемент, повторный — снимает, onChangeValue сообщает', () => {
		const onChangeValue = vi.fn()

		mount(Harness, harness({ onChangeValue }))

		click(rowOf('B'))

		expect(selection()).toEqual(['false', 'true'])
		expect(onChangeValue).toHaveBeenLastCalledWith(expect.objectContaining({ newValue: ['b'] }))

		click(rowOf('B'))

		expect(selection()).toEqual(['false', 'false'])
		expect(onChangeValue).toHaveBeenCalledTimes(2)
	})

	/**
	 * A disabled item is not selected by a click, whether it or the whole list
	 * is disabled. Enabled again, it is selected by the same click: so the
	 * handler is in place and the refusal comes from being disabled.
	 */
	it.each([
		['выключен сам', { itemOff: true }, { itemOff: false }],
		['выключен список', { listOff: true }, { listOff: false }],
	] as const)('%s: клик не выбирает, после включения — выбирает', (_way, off, on) => {
		const props = reactiveProps(harness(off))

		mount(Harness, props)

		expect(rowOf('B').dataset.disabled).toBe('true')

		click(rowOf('B'))

		expect(selection()).toEqual(['false', 'false'])

		Object.assign(props, harness(on))
		flushSync()
		click(rowOf('B'))

		expect(selection()).toEqual(['false', 'true'])
	})

	/**
	 * There is one Tab stop, the list node (APG Listbox); arrows move between
	 * items. The core writes an item's `tabindex="-1"` into its `aria`, and on
	 * the row it overrides the `tabindex="0"` a button on a `div` sets itself:
	 * attributes from outside go on the root over the sets. The root is a frame
	 * around the header, the list and the footer, and is never a stop.
	 */
	it('строки — не остановки Tab, узел списка — остановка, корень — нет', () => {
		const { root } = mount(Harness, harness())

		expect(list().parentElement).toBe(root())
		expect(list().getAttribute('tabindex')).toBe('0')
		expect(root().hasAttribute('tabindex')).toBe(false)
		expect(rows().map((row) => row.getAttribute('tabindex'))).toEqual(['-1', '-1'])
	})

	/**
	 * The core writes the roles: the list node is a `listbox`, with
	 * `aria-multiselectable` in `multiple`, a row is an `option`. The item's
	 * set goes on the row over what a button on a `div` writes itself, so its
	 * `role="button"` does not reach the markup.
	 */
	it('узел списка — listbox с aria-multiselectable, строки — опции, а не кнопки', () => {
		const { root } = mount(Harness, harness())

		expect(list().getAttribute('role')).toBe('listbox')
		expect(list().getAttribute('aria-multiselectable')).toBe('true')
		expect(root().hasAttribute('role')).toBe(false)
		expect(rows().map((row) => row.getAttribute('role'))).toEqual(['option', 'option'])
		expect(document.querySelectorAll('.so-list-box-item [role="button"]')).toHaveLength(0)
	})

	it('стрелки ведут подсветку, Enter и пробел переключают выбор', async () => {
		mount(Harness, harness())

		// The list's keyboard listens to the root from `element:ready`, a frame later
		await nextFrame()

		press(list(), 'ArrowDown')

		expect(rows().map((row) => row.getAttribute('data-highlighted'))).toEqual(['true', 'false'])

		press(list(), 'Enter')

		expect(selection()).toEqual(['true', 'false'])

		press(list(), 'ArrowDown')
		press(list(), ' ')

		expect(selection()).toEqual(['true', 'true'])
	})

	/**
	 * Focus does not move along the rows: the list node's
	 * `aria-activedescendant` names the item under the arrows to a screen
	 * reader (APG Listbox). The item's `id` plugin writes the row's `id` from
	 * the mount, the list's keyboard writes the reference. Before any key there
	 * is no highlight on screen, and no reference.
	 */
	it('элемент под стрелками — aria-activedescendant узла списка на id подсвеченной строки', async () => {
		mount(ListBox, { items: ITEMS })

		await nextFrame()

		const ids = rows().map((row) => row.id)

		expect(ids.every((id) => id !== '')).toBe(true)
		expect(new Set(ids).size).toBe(ids.length)
		expect(list().hasAttribute('aria-activedescendant')).toBe(false)

		for (const step of [0, 1]) {
			press(list(), 'ArrowDown')

			const reference = list().getAttribute('aria-activedescendant')

			expect(reference).toBe(ids[step])
			expect(document.querySelector('[role="option"][data-highlighted="true"]')?.id).toBe(
				reference,
			)
			expect(document.querySelectorAll(`[id="${reference}"]`)).toHaveLength(1)
		}
	})

	/**
	 * An item's own `id` is its input: it goes on the row instead of the `id`
	 * from the mount, and the reference points at it. It does not pass as an
	 * outside attribute (the binding takes it), so only one node has it, the
	 * row. Changed on the highlighted item, the row and the reference follow.
	 */
	it('свой id элемента — на строке, ссылка ведёт на него и идёт за его сменой', async () => {
		const items = (id?: string): ListBoxItemProps[] => [
			{ value: 'a', text: 'Первый', id },
			{ value: 'b', text: 'Второй' },
		]
		const props = reactiveProps<THarnessProps>({ items: items('row-first') })

		mount(Harness, props)

		await nextFrame()
		press(list(), 'ArrowDown')

		expect(rowOf('Первый').id).toBe('row-first')
		expect(list().getAttribute('aria-activedescendant')).toBe('row-first')
		expect(document.querySelectorAll('[id="row-first"]')).toHaveLength(1)
		expect(listItems()[0].hasAttribute('id')).toBe(false)

		props.items = items('row-one')
		flushSync()

		expect(rowOf('Первый').id).toBe('row-one')
		expect(list().getAttribute('aria-activedescendant')).toBe('row-one')

		props.items = items()
		flushSync()

		const fallback = rowOf('Первый').id

		expect(fallback).not.toBe('')
		expect(fallback).not.toBe('row-one')
		expect(list().getAttribute('aria-activedescendant')).toBe(fallback)
	})

	/**
	 * ARIA allows only options inside a `listbox`, so the header and the footer
	 * are children of the root beside the list node. Their keys are not the
	 * list's: a field types, a button is pressed. The parts stand flush: no
	 * whitespace text in the root or in the list.
	 */
	it('шапка и подвал — вне listbox; их клавиши подсветку не двигают', async () => {
		const { root } = mount(ListBox, {
			items: ITEMS.slice(0, 1),
			header: markup('<input class="so-test-header" />'),
			footer: markup('<button class="so-test-footer">Готово</button>'),
		})

		await nextFrame()

		const header = find(document, '.so-test-header', HTMLInputElement)
		const footer = find(document, '.so-test-footer', HTMLButtonElement)

		expect([...root().children]).toEqual([header, list(), footer])
		expect(list().contains(header)).toBe(false)
		expect(list().contains(footer)).toBe(false)
		expect(strayText(root())).toEqual([])
		expect(strayText(list())).toEqual([])

		press(header, 'ArrowDown')
		press(footer, 'ArrowDown')

		expect(rows().map((row) => row.getAttribute('data-highlighted'))).toEqual(['false'])
	})
})

/**
 * An item's selection goes both ways as a prop and callback pair, without
 * `ctrl`: the `selected` prop writes it, and `onChangeSelected` comes only to
 * the item whose selection changed, carrying the new one. The app's state is
 * the parent's props (`reactiveProps`): the callback writes the selection
 * there, and the item gets it back as a prop. The app does not read the
 * collection.
 */
describe('отметка элемента: selected и onChangeSelected', () => {
	/** A list of three with the selections in the parent's props; callbacks go to the log. */
	function app(log: string[], mode?: ListBoxProps['mode']) {
		const props = reactiveProps<THarnessProps>({ list: { mode }, items: [] })
		const item = (value: string, selected: boolean): ListBoxItemProps => ({
			value,
			text: value.toUpperCase(),
			selected,
			onChangeSelected: (next) => {
				log.push(`${value}: ${next}`)

				const own = props.items?.find((candidate) => candidate.value === value)

				if (own) own.selected = next
			},
		})

		props.items = [item('a', true), item('b', false), item('c', false)]
		mount(Harness, props)

		return () => props.items?.map(({ selected }) => String(selected)).join(' ')
	}

	it('клик по B: A получает false, B — true, C молчит; состояние сходится с выбором', () => {
		const log: string[] = []
		const state = app(log)

		expect(selection()).toEqual(['true', 'false', 'false'])

		log.length = 0
		click(rowOf('B'))

		expect(log).toEqual(['a: false', 'b: true'])
		expect(state()).toBe('false true false')
		expect(selection()).toEqual(['false', 'true', 'false'])
	})

	it('multiple: повторный клик снимает только свою отметку', () => {
		const log: string[] = []
		const state = app(log, 'multiple')

		log.length = 0
		click(rowOf('C'))
		click(rowOf('A'))

		expect(log).toEqual(['c: true', 'a: false'])
		expect(state()).toBe('false false true')
		expect(selection()).toEqual(['false', 'false', 'true'])
	})

	it('колбэк получает отметку: boolean', () => {
		expectTypeOf<NonNullable<ListBoxItemProps['onChangeSelected']>>()
			.parameter(0)
			.toEqualTypeOf<boolean>()
	})
})

describe('состав', () => {
	it('список из items рисует элемент на каждый', () => {
		mount(ListBox, { items: ITEMS })

		expect(rows().map((row) => row.textContent?.trim())).toEqual(['Первый', 'Второй', 'Третий'])
	})

	/**
	 * The facade is assembled by the constructor from the same props and has
	 * already written `items`: the binding, given the same props in the effect,
	 * does not write them again. The `items` setter without `trackBy` is a
	 * clear and a new set.
	 */
	it('items пишется один раз: без очистки и повторного добавления', () => {
		const engine = createEngine<TItem>()
		let resets = 0
		let added = 0

		engine.extensions.plain.events.on('reset', () => resets++)
		engine.extensions.plain.events.on('item:added', () => added++)

		mount(ListBox, { engine, items: ITEMS })

		expect(resets).toBe(0)
		expect(added).toBe(ITEMS.length)
		expect(rows()).toHaveLength(ITEMS.length)
	})

	it('engine снаружи: элементы движка рисуются, добавленное в него — тоже', () => {
		const engine = createEngine<TItem>({ items: ITEMS.slice(0, 2) })

		mount(ListBox, { engine })

		expect(listItems()).toHaveLength(2)

		engine.extensions.batch.set([{ value: 'c', text: 'Третий' }])
		flushSync()

		expect(listItems()).toHaveLength(3)
	})

	it('value от родителя выбирает элемент, и выбор следует за ним', () => {
		const props = reactiveProps<ListBoxProps>({ items: ITEMS, value: 'b' })

		mount(ListBox, props)

		expect(selection()).toEqual(['false', 'true', 'false'])

		props.value = 'c'
		flushSync()

		expect(selection()).toEqual(['false', 'false', 'true'])
	})

	it('сузили shown — на экране меньше элементов, в коллекции все', () => {
		const engine = createEngine<TItem>({ items: ITEMS })

		mount(ListBox, { engine })

		engine.getCore().driver.events.on('items:query:before', (e) => {
			e.items = e.items.filter((item) => item.value !== 'b')
		})
		engine.getCore().driver.invalidateQuery()
		flushSync()

		expect(listItems()).toHaveLength(2)
		expect(engine.extensions.batch.items).toHaveLength(3)
	})

	/**
	 * The facade's binding takes the facade props (`mode`, `items`, `engine` of
	 * the list and `selected` of an item), so they do not reach the DOM as
	 * attributes. What neither the component nor the facade took does: to the
	 * list node for the list, to the row for an item.
	 */
	it('пропсы фасада — не атрибуты, атрибуты потребителя — атрибуты', () => {
		const engine = createEngine<TItem>()
		const { root } = mount(Harness, {
			list: { engine, mode: 'multiple', items: ITEMS, title: 'Города' },
			items: [{ value: 'z', text: 'Z', selected: true, title: 'Строка' }],
		})

		for (const name of ['mode', 'items', 'engine']) {
			expect(root().hasAttribute(name), name).toBe(false)
			expect(list().hasAttribute(name), name).toBe(false)
		}

		expect(root().hasAttribute('title')).toBe(false)
		expect(list().getAttribute('title')).toBe('Города')
		expect(rowOf('Z').hasAttribute('selected')).toBe(false)
		expect(rowOf('Z').getAttribute('title')).toBe('Строка')
	})

	it('selected элемента разметки выбирает его при входе в коллекцию', () => {
		mount(Harness, {
			items: [
				{ value: 'a', text: 'A' },
				{ value: 'b', text: 'B', selected: true },
			],
		})

		expect(selection()).toEqual(['false', 'true'])
	})

	it('класс и стиль потребителя — корню элемента, остальное — строке', () => {
		mount(Harness, {
			items: [{ value: 'a', text: 'A', class: 'mine', style: 'color: red', id: 'row-a' }],
		})

		const item = find(document, '.so-list-box-item', HTMLElement)

		expect(item.classList.contains('mine')).toBe(true)
		expect(item.style.color).toBe('red')
		expect(rowOf('A').id).toBe('row-a')
		expect(rowOf('A').classList.contains('mine')).toBe(false)
	})

	it('клик потребителя по строке не отменяет выбор', () => {
		const onclick = vi.fn()

		mount(Harness, { items: [{ value: 'a', text: 'A', onclick }] })

		click(rowOf('A'))

		expect(onclick).toHaveBeenCalledTimes(1)
		expect(selection()).toEqual(['true'])
	})
})

describe('отметка выбранного и слоты', () => {
	it('без indicator обёртки отметки нет', () => {
		mount(ListBox, { items: ITEMS, value: 'a' })

		expect(document.querySelectorAll('.so-list-box-item__indicator')).toHaveLength(0)
	})

	/**
	 * Every item has the wrapper, unselected ones too: it reserves the space,
	 * or rows would jump on selection. The icon inside is only on the selected.
	 */
	it('обёртка — у каждого элемента, иконка — у выбранного, из дерева доступности убрана', () => {
		mount(ListBox, { items: ITEMS, indicator: 'start' })

		expect(document.querySelectorAll('.so-list-box-item__indicator')).toHaveLength(3)
		expect(document.querySelectorAll('.so-list-box-item__indicator svg')).toHaveLength(0)

		click(rowOf('Второй'))

		expect(
			listItems().map((item) => !!item.querySelector('.so-list-box-item__indicator svg')),
		).toEqual([false, true, false])
		expect(
			find(document, '.so-list-box-item__indicator', HTMLElement).getAttribute('aria-hidden'),
		).toBe('true')
	})

	it('start ставит отметку перед текстом, end — после', () => {
		const sideOf = () => {
			const indicator = find(document, '.so-list-box-item__indicator', HTMLElement)
			const text = find(document, '.so-button__text', HTMLElement)

			return indicator.compareDocumentPosition(text) & Node.DOCUMENT_POSITION_FOLLOWING
				? 'start'
				: 'end'
		}
		const props = reactiveProps<ListBoxProps>({ items: ITEMS.slice(0, 1), indicator: 'start' })

		mount(ListBox, props)

		expect(sideOf()).toBe('start')

		props.indicator = 'end'
		flushSync()

		expect(sideOf()).toBe('end')
	})

	it('слот indicator-icon подменяет иконку и получает selected', () => {
		mount(Slots, { case: 'indicator' })

		expect(document.querySelector('.custom')).toBeNull()

		click(rowOf('A'))

		expect(document.querySelector('.so-list-box-item__indicator .custom')).not.toBeNull()
		expect(document.querySelector('.so-list-box-item__indicator svg')).toBeNull()
	})

	it('children элемента получает text и selected, без него — text', () => {
		mount(Harness, {
			items: [
				{
					value: 'a',
					text: 'A',
					children: scopeText<TRowScope>(
						({ text, selected }) => `${text}:${String(selected)}`,
					),
				},
				{ value: 'b', text: 'B' },
			],
		})

		expect(rows().map((row) => row.textContent?.trim())).toEqual(['A:false', 'B'])

		click(rowOf('A:false'))

		expect(rows().map((row) => row.textContent?.trim())).toEqual(['A:true', 'B'])
	})

	it('слоты элементов списка из items получают элемент через scope', () => {
		mount(ListBox, {
			items: ITEMS.slice(0, 2),
			header: markup('<i class="head">шапка</i>'),
			footer: markup('<i class="foot">подвал</i>'),
			item: scopeText<TItemRowScope>(({ item }) => `[${item.text}]`),
			'item-leading': scopeMarkup<TItemScope>(
				({ item }) => `<u class="lead">${String(item.value)}</u>`,
			),
			'item-trailing': scopeMarkup<TItemScope>(
				({ item }) => `<s class="trail">${String(item.value)}</s>`,
			),
		})

		expect(rows().map((row) => row.querySelector('.so-button__text')?.textContent)).toEqual([
			'[Первый]',
			'[Второй]',
		])
		expect([...document.querySelectorAll('.lead')].map((node) => node.textContent)).toEqual([
			'a',
			'b',
		])
		expect([...document.querySelectorAll('.trail')].map((node) => node.textContent)).toEqual([
			'a',
			'b',
		])
		expect(document.querySelector('.head')?.textContent).toBe('шапка')
		expect(document.querySelector('.foot')?.textContent).toBe('подвал')
	})

	/**
	 * The relay is whole: the `item` scope is the item slot's scope plus the
	 * item itself. A slot drawn by the list without the relay would lose the
	 * item's scope: the item holds `text` and `selected`.
	 */
	it('item получает text и selected элемента, selected следует за выбором', () => {
		mount(ListBox, {
			items: ITEMS.slice(0, 2),
			item: scopeText<TItemRowScope>(
				({ item, text, selected }) => `${String(item.value)}:${text}:${String(selected)}`,
			),
		})

		expect(rows().map((row) => row.textContent?.trim())).toEqual([
			'a:Первый:false',
			'b:Второй:false',
		])

		click(rowOf('b:Второй:false'))

		expect(rows().map((row) => row.textContent?.trim())).toEqual([
			'a:Первый:false',
			'b:Второй:true',
		])
	})

	/**
	 * A snippet is opaque: the item cannot see what it drew there, so the
	 * indicator given to the list stands in every item instead of its own, even
	 * where the snippet is empty. In React and Vue an empty slot gives way to
	 * the icon. Here the snippet draws the icon itself, branching on `item`.
	 */
	it('item-indicator-icon задан — у каждого элемента вместо своей отметки', () => {
		mount(Slots, { case: 'owner-indicator' })

		const marks = () =>
			[...document.querySelectorAll('.so-list-box-item__indicator')].map((indicator) =>
				indicator.querySelector('.probe')
					? `slot:${indicator.textContent ?? ''}`
					: indicator.querySelector('svg')
						? 'icon'
						: 'empty',
			)
		// The indicator's text is part of the row's text: take the rows by position
		const rowAt = (index: number) => find(listItems()[index], '.so-button', HTMLElement)

		expect(marks()).toEqual(['slot:false', 'empty'])

		click(rowAt(0))
		click(rowAt(1))

		expect(marks()).toEqual(['slot:true', 'empty'])
	})

	it('empty — пока элементов нет: в узле списка, между шапкой и подвалом; появились — пропал', () => {
		const props = reactiveProps<ListBoxProps>({
			items: [],
			header: markup('<i class="head"></i>'),
			empty: markup('<p class="probe">Пусто</p>'),
			footer: markup('<i class="foot"></i>'),
		})
		const { root } = mount(ListBox, props)

		expect([...root().children].map((child) => child.className)).toEqual([
			'head',
			'so-list-box__list',
			'foot',
		])
		expect([...list().children].map((child) => child.className)).toEqual(['probe'])

		props.items = ITEMS.slice(0, 2)
		flushSync()

		expect(document.querySelector('.probe')).toBeNull()
		expect(listItems()).toHaveLength(2)
	})
})

/**
 * Groups, as in Vue (`ui/vue/__tests__/list-groups.spec.ts`). From data: the
 * drawn sections (`drawnSections`) are a labelled group in `ListBox.Group`,
 * items without a group sit right in the list, and between sections, while
 * the list asks for them (`groupSeparators`, off by default), goes a silent
 * separator; groups from `groups` come first, the rest in place. In markup,
 * `ListBox.Group` joins the same grouping, and the sections describe it.
 * Arrows move in the order items stand on screen. The parts stand flush: no
 * whitespace text in the list or in a group.
 */
describe('группы', () => {
	/** In the data «Морковь» stands between the fruits, «Вода» has no group. */
	const MIXED = [
		{ value: 'apple', text: 'Яблоко', _: { group: 'fruit' } },
		{ value: 'carrot', text: 'Морковь', _: { group: 'veg' } },
		{ value: 'water', text: 'Вода' },
		{ value: 'pear', text: 'Груша', _: { group: 'fruit' } },
	]

	const GROUPS = [
		{ key: 'fruit', label: 'Фрукты' },
		{ key: 'veg', label: 'Овощи' },
	]

	/** The list's parts: a group as its label and item texts, a separator as `—`. */
	const parts = () =>
		[...list().children].map((node) => {
			if (node.classList.contains('so-list-box-group')) {
				return [
					node.querySelector('.so-list-box-group__label')?.textContent?.trim() ?? '',
					[...node.querySelectorAll('.so-list-box-item')].map((item) =>
						item.textContent?.trim(),
					),
				]
			}

			if (node.classList.contains('so-list-box__separator')) return '—'

			return node.textContent?.trim()
		})

	/** The sections of `MIXED` on screen, without and with separators. */
	const SECTIONS = [['Фрукты', ['Яблоко', 'Груша']], ['Овощи', ['Морковь']], 'Вода']
	const SEPARATED = [['Фрукты', ['Яблоко', 'Груша']], '—', ['Овощи', ['Морковь']], '—', 'Вода']

	it('группа с подписью, без группы — последними; разделителей по умолчанию нет', () => {
		mount(ListBox, { items: MIXED, groups: GROUPS })

		expect(parts()).toEqual(SECTIONS)

		const groups = [...list().querySelectorAll('.so-list-box-group')]

		for (const group of groups) {
			const label = find(group, '.so-list-box-group__label', HTMLElement)

			expect(group.getAttribute('role')).toBe('group')
			expect(group.getAttribute('aria-labelledby')).toBe(label.id)
			expect(label.id).not.toBe('')
			expect(label.getAttribute('role')).toBe('presentation')
			expect(strayText(group)).toEqual([])
		}

		expect(strayText(list())).toEqual([])
	})

	it('groupSeparators — немой разделитель между соседними секциями, на лету тоже', () => {
		const props = reactiveProps<ListBoxProps>({
			items: MIXED,
			groups: GROUPS,
			groupSeparators: true,
		})

		mount(ListBox, props)

		expect(parts()).toEqual(SEPARATED)
		expect(strayText(list())).toEqual([])
		expect(
			[...list().querySelectorAll('.so-list-box__separator')].map((node) =>
				node.getAttribute('aria-hidden'),
			),
		).toEqual(['true', 'true'])

		props.groupSeparators = false
		flushSync()

		expect(parts()).toEqual(SECTIONS)
	})

	it('стрелки ходят порядком экрана: ↓ после «Яблока» — «Груша»', async () => {
		mount(ListBox, { items: MIXED, groups: GROUPS })

		await nextFrame()

		const highlighted = () =>
			rows()
				.find((row) => row.getAttribute('data-highlighted') === 'true')
				?.textContent?.trim()

		press(list(), 'ArrowDown')
		expect(highlighted()).toBe('Яблоко')

		press(list(), 'ArrowDown')
		expect(highlighted()).toBe('Груша')

		press(list(), 'ArrowDown')
		expect(highlighted()).toBe('Морковь')
	})

	it('смена подписи в groups перерисовывает подписи групп', () => {
		const props = reactiveProps<ListBoxProps>({ items: MIXED, groups: GROUPS })

		mount(ListBox, props)

		props.groups = [
			{ key: 'fruit', label: 'Fruit' },
			{ key: 'veg', label: 'Vegetables' },
		]
		flushSync()

		expect(parts()).toEqual([
			['Fruit', ['Яблоко', 'Груша']],
			['Vegetables', ['Морковь']],
			'Вода',
		])
	})

	it('без группировки — ни групп, ни разделителей', () => {
		mount(ListBox, { items: ITEMS })

		expect(parts()).toEqual(['Первый', 'Второй', 'Третий'])
	})

	/** Sections in brief: the group label (`null` without a group) and the item values. */
	const brief = (engine: TListBoxCollection) =>
		engine.extensions.group.sections.map(({ group, items }) => [
			group === null ? null : (group.label ?? ''),
			items.map((item) => item.value),
		])

	it('группа разметки — в группировке: секции с подписью, элементы вне группы — на местах', () => {
		const engine = createEngineListBox()

		mount(Groups, { engine })

		expect(brief(engine)).toEqual([
			[null, ['water']],
			['Фрукты', ['apple', 'pear']],
			[null, ['juice']],
		])
		expect(parts()).toEqual(['Вода', ['Фрукты', ['Яблоко', 'Груша']], 'Сок'])
	})

	it('стрелки по группе разметки — порядком экрана: «Вода» над группой — первой', async () => {
		mount(Groups, { engine: createEngineListBox() })

		await nextFrame()

		const highlighted = () =>
			rows()
				.find((row) => row.getAttribute('data-highlighted') === 'true')
				?.textContent?.trim()
		const visited: unknown[] = []

		for (let step = 0; step < 4; step += 1) {
			press(list(), 'ArrowDown')
			visited.push(highlighted())
		}

		expect(visited).toEqual(['Вода', 'Яблоко', 'Груша', 'Сок'])
	})

	it('смена подписи группы разметки — новая подпись секции', () => {
		const engine = createEngineListBox()
		const props = reactiveProps({ engine, label: 'Фрукты' })

		mount(Groups, props)

		props.label = 'Ягоды'
		flushSync()

		expect(brief(engine)[1]).toEqual(['Ягоды', ['apple', 'pear']])
	})
})

describe('типы', () => {
	it('ListBox.Item — это ListBoxItem', () => {
		expect(ListBox.Item).toBe(ListBoxItem)
		expectTypeOf(ListBox.Item).toEqualTypeOf<typeof ListBoxItem>()
	})

	it('ListBox.Group — это ListBoxGroup', () => {
		expect(ListBox.Group).toBe(ListBoxGroup)
		expectTypeOf(ListBox.Group).toEqualTypeOf<typeof ListBoxGroup>()
	})

	/** The type is checked not by vitest but by the CI step «Типы — Svelte». */
	it('слоты несут scope из дескрипторов', () => {
		expectTypeOf<Snippet<[{ item: IListBoxItem; text: string; selected: boolean }]>>().toExtend<
			NonNullable<ListBoxProps['item']>
		>()
		expectTypeOf<Snippet<[{ item: IListBoxItem; selected: boolean }]>>().toExtend<
			NonNullable<ListBoxProps['item-indicator-icon']>
		>()
		expectTypeOf<Snippet<[{ text: string; selected: boolean }]>>().toExtend<
			NonNullable<ListBoxItemProps['children']>
		>()
		expectTypeOf<Snippet<[{ selected: boolean }]>>().toExtend<
			NonNullable<ListBoxItemProps['indicator-icon']>
		>()
	})

	it('колбэки фасада — пропсы компонента', () => {
		expectTypeOf<ListBoxProps>().toHaveProperty('onChangeMode')
		expectTypeOf<ListBoxProps>().toHaveProperty('onEngineCreate')
		expectTypeOf<ListBoxProps>().toHaveProperty('onChangeValue')
		expectTypeOf<ListBoxItemProps>().toHaveProperty('onChangeSelected')
		expectTypeOf<ListBoxItemProps>().toHaveProperty('onChangeOrder')
	})

	it('value списка — значение элементов', () => {
		expectTypeOf<NonNullable<ListBoxProps['value']>>().toEqualTypeOf<
			NonNullable<TListBoxValue>
		>()
	})
})

/**
 * The consumer hears the markup items join the collection while mounting, as
 * in the other adapters: the subscription began in an effect, after the
 * children, and `onItemAdded` stayed silent for them
 * (benchmarks/parity/README.md).
 */
describe('события монтирования', () => {
	it('onItemAdded — каждый элемент разметки, в порядке DOM', async () => {
		const added: unknown[] = []

		mount(Harness, {
			list: { onItemAdded: (event) => added.push(Reflect.get(Object(event.item), 'value')) },
			items: [
				{ value: 'a', text: 'A' },
				{ value: 'b', text: 'B' },
			],
		})
		await flush()

		expect(added).toEqual(['a', 'b'])
	})
})

/**
 * The consumer hears nothing once the teardown began, as in the other
 * adapters. Unsubscribed in an effect made after the template's blocks, it
 * heard the markup items leaving the collection send `onChangeItems` with an
 * ever shorter list, so a consumer keeping it in its state lost the list with
 * the owner (benchmarks/parity/README.md).
 */
describe('события снятия', () => {
	it('уходящие элементы разметки и отвязка корня до потребителя не доходят', async () => {
		const heard: string[] = []

		const { destroy } = mount(Harness, {
			list: {
				onChangeItems: (items) => heard.push(`items ${items.length}`),
				onItemRemoved: () => heard.push('item:removed'),
				onElementRemoved: () => heard.push('element:removed'),
			},
			items: [
				{ value: 'a', text: 'A' },
				{ value: 'b', text: 'B' },
			],
		})
		await nextFrame()

		expect(heard.at(-1)).toBe('items 2')

		const mounted = heard.length

		destroy()

		expect(heard.slice(mounted)).toEqual([])
	})
})

/**
 * Markup items hear nothing of their siblings going with the owner. Svelte
 * destroys them one by one, and an item still listened to heard its order
 * change as the earlier ones left; the owner's `detach` detaches its
 * collection's members before any goes (`TCollectionMembers`).
 */
describe('события снятия элементов', () => {
	it('элементы разметки не слышат, как уходят соседи', async () => {
		const heard: string[] = []
		const item = (value: string): ListBoxItemProps => ({
			value,
			text: value,
			onChangeOrder: () => heard.push(`${value} order`),
			onChangeSelected: () => heard.push(`${value} selected`),
			onChangeAria: () => heard.push(`${value} aria`),
		})

		const { destroy } = mount(Harness, { items: [item('a'), item('b'), item('c')] })
		await nextFrame()

		const mounted = heard.length

		destroy()

		expect(heard.slice(mounted)).toEqual([])
	})
})
