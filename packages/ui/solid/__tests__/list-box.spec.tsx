/**
 * ListBox in Solid, the adapter's first collection.
 *
 * The collection engine, its extensions and plugins are shared unchanged, and
 * these tests check that the core's mechanics are not written for Vue and
 * React. The scenarios are those of React (`list-box.spec.tsx`) and Svelte
 * (`list-box.spec.ts`): selection, composition, the indicator and slots.
 *
 * What is Solid's own is when an item joins the collection: as the component
 * body runs (the context's `attach` in `useAdapter`), as in Vue and Svelte.
 * The elevator is a layer of values `Elevate` gives the children; it is
 * covered by `collection-elevator.spec.tsx`.
 *
 * And the loop. The `drawn` records are new on every change, and `<For>`
 * would recreate every list item with its nodes and focus. The adapter's loop
 * keeps a node by the record's key (`KeyedFor`): an item added to the list
 * leaves its siblings alone.
 */

import { describe, it, expect, expectTypeOf, vi } from 'vitest'
import { createSignal, For, Show, type JSX } from 'solid-js'
import {
	createEngine,
	createEngineListBox,
	type IListBoxItem,
	type TListBoxCollection,
	type TListBoxValue,
	type TListBoxView,
	type TListIndicator,
} from '@soldy-ui/core'
import {
	ListBox,
	ListBoxGroup,
	ListBoxItem,
	type ListBoxItemProps,
	type ListBoxProps,
} from '@soldy-ui/solid'
import { find, mount, nextFrame } from './mount'

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

/** A key on a node as the browser sends it: bubbling and cancelable. */
function press(target: Element, key: string): void {
	target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
}

/** Microtasks: the engine announces `engine:create` on them. */
async function flush(): Promise<void> {
	await Promise.resolve()
}

/** The engine as the test sees it: the item composition. */
type TEngineView = { extensions: { batch: { items: readonly object[] } } }

const valuesOf = (engine: TEngineView | undefined) =>
	engine?.extensions.batch.items.map((item) => Reflect.get(item, 'value'))

/** "B" is disabled by `itemOff`, the whole list by `listOff`. */
type TOff = { itemOff?: boolean; listOff?: boolean }

/** A list of two markup items; disabled state comes from a signal. */
function harness(off: () => TOff, list: ListBoxProps = {}): () => JSX.Element {
	return () => (
		<ListBox mode="multiple" disabled={off().listOff ?? false} {...list}>
			<ListBox.Item value="a" text="A" />
			<ListBox.Item value="b" text="B" disabled={off().itemOff ?? false} />
		</ListBox>
	)
}

describe('выбор', () => {
	it('элементы разметки входят в коллекцию в порядке DOM', async () => {
		const engines: TEngineView[] = []

		mount(() => (
			<ListBox onEngineCreate={(engine) => engines.push(engine)}>
				<ListBox.Item value="a" text="A" />
				<ListBox.Item value="b" text="B" />
				<ListBox.Item value="c" text="C" />
			</ListBox>
		))
		await flush()

		expect(valuesOf(engines.at(-1))).toEqual(['a', 'b', 'c'])
	})

	it('клик по строке выбирает элемент, повторный — снимает, onChangeValue сообщает', () => {
		const onChangeValue = vi.fn()

		mount(harness(() => ({}), { onChangeValue }))

		rowOf('B').click()

		expect(selection()).toEqual(['false', 'true'])
		expect(onChangeValue).toHaveBeenLastCalledWith(expect.objectContaining({ newValue: ['b'] }))

		rowOf('B').click()

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
		const [state, setState] = createSignal<TOff>(off)

		mount(harness(state))

		expect(rowOf('B').dataset.disabled).toBe('true')

		rowOf('B').click()

		expect(selection()).toEqual(['false', 'false'])

		setState(on)
		rowOf('B').click()

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
		const { root } = mount(harness(() => ({})))

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
		const { root } = mount(harness(() => ({})))

		expect(list().getAttribute('role')).toBe('listbox')
		expect(list().getAttribute('aria-multiselectable')).toBe('true')
		expect(root().hasAttribute('role')).toBe(false)
		expect(rows().map((row) => row.getAttribute('role'))).toEqual(['option', 'option'])
		expect(document.querySelectorAll('.so-list-box-item [role="button"]')).toHaveLength(0)
	})

	it('стрелки ведут подсветку, Enter и пробел переключают выбор', async () => {
		mount(harness(() => ({})))

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
		mount(() => <ListBox items={ITEMS} />)

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
		const [own, setOwn] = createSignal<string | undefined>('row-first')

		mount(() => (
			<ListBox>
				<ListBox.Item value="a" text="Первый" id={own()} />
				<ListBox.Item value="b" text="Второй" />
			</ListBox>
		))

		await nextFrame()
		press(list(), 'ArrowDown')

		expect(rowOf('Первый').id).toBe('row-first')
		expect(list().getAttribute('aria-activedescendant')).toBe('row-first')
		expect(document.querySelectorAll('[id="row-first"]')).toHaveLength(1)
		expect(listItems()[0].hasAttribute('id')).toBe(false)

		setOwn('row-one')

		expect(rowOf('Первый').id).toBe('row-one')
		expect(list().getAttribute('aria-activedescendant')).toBe('row-one')

		setOwn(undefined)

		const fallback = rowOf('Первый').id

		expect(fallback).not.toBe('')
		expect(fallback).not.toBe('row-one')
		expect(list().getAttribute('aria-activedescendant')).toBe(fallback)
	})

	/**
	 * ARIA allows only options inside a `listbox`, so the header and the footer
	 * are children of the root beside the list node. Their keys are not the
	 * list's: a field types, a button is pressed.
	 */
	it('шапка и подвал — вне listbox; их клавиши подсветку не двигают', async () => {
		const { root } = mount(() => (
			<ListBox
				header={<input class="so-test-header" />}
				footer={<button class="so-test-footer">Готово</button>}
			>
				<ListBox.Item value="a" text="A" />
			</ListBox>
		))

		await nextFrame()

		const header = find(document, '.so-test-header', HTMLInputElement)
		const footer = find(document, '.so-test-footer', HTMLButtonElement)

		expect([...root().children]).toEqual([header, list(), footer])
		expect(list().contains(header)).toBe(false)
		expect(list().contains(footer)).toBe(false)

		press(header, 'ArrowDown')
		press(footer, 'ArrowDown')

		expect(rows().map((row) => row.getAttribute('data-highlighted'))).toEqual(['false'])
	})
})

/**
 * An item's selection goes both ways as a prop and callback pair, without
 * `ctrl`: the `selected` prop writes it, and `onChangeSelected` comes only to
 * the item whose selection changed, carrying the new one. Solid has no
 * `v-model`, so the app's state holds the selection itself and does not read
 * the collection.
 */
describe('отметка элемента: selected и onChangeSelected', () => {
	/** A list of three with the selections in the app's signals; callbacks go to the log. */
	function app(log: string[], mode?: ListBoxProps['mode']) {
		const marks = ['a', 'b', 'c'].map((value, index) => {
			const [selected, setSelected] = createSignal(index === 0)

			return { value, selected, setSelected }
		})

		mount(() => (
			<ListBox mode={mode}>
				<For each={marks}>
					{({ value, selected, setSelected }) => (
						<ListBox.Item
							value={value}
							text={value.toUpperCase()}
							selected={selected()}
							onChangeSelected={(next) => {
								log.push(`${value}: ${next}`)
								setSelected(next)
							}}
						/>
					)}
				</For>
			</ListBox>
		))

		return () => marks.map(({ selected }) => String(selected())).join(' ')
	}

	it('клик по B: A получает false, B — true, C молчит; состояние сходится с выбором', () => {
		const log: string[] = []
		const state = app(log)

		expect(selection()).toEqual(['true', 'false', 'false'])

		log.length = 0
		rowOf('B').click()

		expect(log).toEqual(['a: false', 'b: true'])
		expect(state()).toBe('false true false')
		expect(selection()).toEqual(['false', 'true', 'false'])
	})

	it('multiple: повторный клик снимает только свою отметку', () => {
		const log: string[] = []
		const state = app(log, 'multiple')

		log.length = 0
		rowOf('C').click()
		rowOf('A').click()

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
		mount(() => <ListBox items={ITEMS} />)

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

		mount(() => <ListBox engine={engine} items={ITEMS} />)

		expect(resets).toBe(0)
		expect(added).toBe(ITEMS.length)
		expect(rows()).toHaveLength(ITEMS.length)
	})

	it('engine снаружи: элементы движка рисуются, добавленное в него — тоже', () => {
		const engine = createEngine<TItem>({ items: ITEMS.slice(0, 2) })

		mount(() => <ListBox engine={engine} />)

		expect(listItems()).toHaveLength(2)

		engine.extensions.batch.set([{ value: 'c', text: 'Третий' }])

		expect(listItems()).toHaveLength(3)
	})

	it('value от родителя выбирает элемент, и выбор следует за ним', () => {
		const [value, setValue] = createSignal('b')

		mount(() => <ListBox items={ITEMS} value={value()} />)

		expect(selection()).toEqual(['false', 'true', 'false'])

		setValue('c')

		expect(selection()).toEqual(['false', 'false', 'true'])
	})

	it('сузили shown — на экране меньше элементов, в коллекции все', () => {
		const engine = createEngine<TItem>({ items: ITEMS })

		mount(() => <ListBox engine={engine} />)

		engine.getCore().driver.events.on('items:query:before', (e) => {
			e.items = e.items.filter((item) => item.value !== 'b')
		})
		engine.getCore().driver.invalidateQuery()

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
		const { root } = mount(() => (
			<ListBox engine={engine} mode="multiple" items={ITEMS} title="Города">
				<ListBox.Item value="z" text="Z" selected title="Строка" />
			</ListBox>
		))

		for (const name of ['mode', 'items', 'engine']) {
			expect(root().hasAttribute(name), name).toBe(false)
			expect(list().hasAttribute(name), name).toBe(false)
		}

		expect(root().hasAttribute('title')).toBe(false)
		expect(list().getAttribute('title')).toBe('Города')
		expect(rowOf('Z').hasAttribute('selected')).toBe(false)
		expect(rowOf('Z').getAttribute('title')).toBe('Строка')
	})

	/**
	 * A markup item the engine removed while it is mounted is not drawn
	 * (`TItemContext.destroy`) but stays the list's content: the slot is given
	 * as a value, not as nodes. The fallback from data does not switch on from
	 * sections not yet updated and does not bring the removed item back into
	 * the collection: the list is empty, with the `empty` slot in place of the
	 * items.
	 */
	it.each([
		[
			'remove',
			(engine: TListBoxCollection) =>
				engine.extensions.batch.remove([...engine.extensions.batch.items]),
		],
		['clear', (engine: TListBoxCollection) => engine.extensions.batch.clear()],
	])(
		'элемент разметки, удалённый движком (%s), — коллекция пуста, empty на месте',
		(_name, drop) => {
			const engine = createEngineListBox()

			mount(() => (
				<ListBox engine={engine} empty={<span class="empty">Пусто</span>}>
					<ListBox.Item value="a" text="A" />
				</ListBox>
			))

			expect(valuesOf(engine)).toEqual(['a'])

			drop(engine)

			expect(engine.extensions.batch.items).toEqual([])
			expect(engine.extensions.batch.shown).toEqual([])
			expect(listItems()).toHaveLength(0)
			expect([...list().children].map((child) => child.className)).toEqual(['empty'])
		},
	)

	it('selected элемента разметки выбирает его при входе в коллекцию', () => {
		mount(() => (
			<ListBox>
				<ListBox.Item value="a" text="A" />
				<ListBox.Item value="b" text="B" selected />
			</ListBox>
		))

		expect(selection()).toEqual(['false', 'true'])
	})

	it('класс и стиль потребителя — корню элемента, остальное — строке', () => {
		mount(() => (
			<ListBox>
				<ListBox.Item value="a" text="A" class="mine" style={{ color: 'red' }} id="row-a" />
			</ListBox>
		))

		const item = find(document, '.so-list-box-item', HTMLElement)

		expect(item.classList.contains('mine')).toBe(true)
		expect(item.style.color).toBe('red')
		expect(rowOf('A').id).toBe('row-a')
		expect(rowOf('A').classList.contains('mine')).toBe(false)
	})

	it('клик потребителя по строке не отменяет выбор', () => {
		const onClick = vi.fn()

		mount(() => (
			<ListBox>
				<ListBox.Item value="a" text="A" onClick={onClick} />
			</ListBox>
		))

		rowOf('A').click()

		expect(onClick).toHaveBeenCalledTimes(1)
		expect(selection()).toEqual(['true'])
	})

	/** A Solid handler can be a `[handler, data]` pair: the merge calls it the same way. */
	it('клик потребителя парой [handler, data] — после выбора, с данными', () => {
		const calls: Array<[string, boolean]> = []
		const handler = (data: string, event: MouseEvent) => {
			calls.push([data, event instanceof MouseEvent])
		}

		mount(() => (
			<ListBox>
				<ListBox.Item value="a" text="A" onClick={[handler, 'данные']} />
			</ListBox>
		))

		rowOf('A').click()

		expect(calls).toEqual([['данные', true]])
		expect(selection()).toEqual(['true'])
	})

	/**
	 * The facade gives an item its row's view, and a list without a view has
	 * none at all: Solid's store has no key with an `undefined` value. A view
	 * set later reaches the rows: the state of the item's two contexts sees it.
	 */
	it('view, заданный списку после монтирования, доходит до строк', () => {
		const [view, setView] = createSignal<TListBoxView | undefined>(undefined)
		const views = () =>
			rows().map((row) => [...row.classList].filter((name) => name.includes('--view-')))

		mount(() => <ListBox items={ITEMS.slice(0, 2)} view={view()} />)

		expect(views()).toEqual([[], []])

		setView('ghost')

		expect(views()).toEqual([['so-button--view-ghost'], ['so-button--view-ghost']])
	})
})

/**
 * A loop by record key. The collection rebuilds the `drawn` records on every
 * change, and an item's node is kept by the record's key: an added item does
 * not recreate its siblings, their nodes stay the same and focus stays put.
 */
describe('петля по drawn', () => {
	it('элемент, добавленный в items, не пересоздаёт соседей — узел и фокус на месте', async () => {
		const engine = createEngineListBox({ items: ITEMS.slice(0, 2) })

		mount(() => <ListBox engine={engine} />)
		await nextFrame()

		const before = listItems()
		const focused = rowOf('Второй')

		focused.focus()

		expect(document.activeElement).toBe(focused)

		engine.extensions.batch.set([{ value: 'c', text: 'Третий' }])

		const after = listItems()

		expect(after).toHaveLength(3)
		expect(after.slice(0, 2)).toEqual(before)
		after.slice(0, 2).forEach((node, index) => expect(node).toBe(before[index]))
		expect(rowOf('Второй')).toBe(focused)
		expect(document.activeElement).toBe(focused)
	})

	/** With `trackBy` a change of `items` edits the composition: the siblings stay the same items. */
	it('снятый из items элемент уходит со своим узлом, соседи на месте', () => {
		const [items, setItems] = createSignal<TItem[]>(ITEMS)

		mount(() => <ListBox items={items()} trackBy={(item) => Reflect.get(item, 'value')} />)

		const [first, , third] = listItems()

		setItems([ITEMS[0], ITEMS[2]])

		const after = listItems()

		expect(after).toHaveLength(2)
		expect(after[0]).toBe(first)
		expect(after[1]).toBe(third)
	})
})

describe('отметка выбранного и слоты', () => {
	it('без indicator обёртки отметки нет', () => {
		mount(() => <ListBox items={ITEMS} value="a" />)

		expect(document.querySelectorAll('.so-list-box-item__indicator')).toHaveLength(0)
	})

	/**
	 * Every item has the wrapper, unselected ones too: it reserves the space,
	 * or rows would jump on selection. The icon inside is only on the selected.
	 */
	it('обёртка — у каждого элемента, иконка — у выбранного, из дерева доступности убрана', () => {
		mount(() => <ListBox items={ITEMS} indicator="start" />)

		expect(document.querySelectorAll('.so-list-box-item__indicator')).toHaveLength(3)
		expect(document.querySelectorAll('.so-list-box-item__indicator svg')).toHaveLength(0)

		rowOf('Второй').click()

		expect(
			listItems().map((item) => !!item.querySelector('.so-list-box-item__indicator svg')),
		).toEqual([false, true, false])
		expect(
			find(document, '.so-list-box-item__indicator', HTMLElement).getAttribute('aria-hidden'),
		).toBe('true')
	})

	it('start ставит отметку перед текстом, end — после', () => {
		const [indicator, setIndicator] = createSignal<TListIndicator>('start')
		const sideOf = () => {
			const mark = find(document, '.so-list-box-item__indicator', HTMLElement)
			const text = find(document, '.so-button__text', HTMLElement)

			return mark.compareDocumentPosition(text) & Node.DOCUMENT_POSITION_FOLLOWING
				? 'start'
				: 'end'
		}

		mount(() => <ListBox items={ITEMS.slice(0, 1)} indicator={indicator()} />)

		expect(sideOf()).toBe('start')

		setIndicator('end')

		expect(sideOf()).toBe('end')
	})

	it('слот indicator-icon подменяет иконку и получает selected', () => {
		mount(() => (
			<ListBox indicator="start">
				<ListBox.Item
					value="a"
					text="A"
					indicator-icon={({ selected }) => (selected ? <b class="custom">V</b> : null)}
				/>
			</ListBox>
		))

		expect(document.querySelector('.custom')).toBeNull()

		rowOf('A').click()

		expect(document.querySelector('.so-list-box-item__indicator .custom')).not.toBeNull()
		expect(document.querySelector('.so-list-box-item__indicator svg')).toBeNull()
	})

	it('children элемента получает text и selected, без него — text', () => {
		mount(() => (
			<ListBox>
				<ListBox.Item value="a" text="A">
					{({ text, selected }) => `${text}:${String(selected)}`}
				</ListBox.Item>
				<ListBox.Item value="b" text="B" />
			</ListBox>
		))

		expect(rows().map((row) => row.textContent?.trim())).toEqual(['A:false', 'B'])

		rowOf('A:false').click()

		expect(rows().map((row) => row.textContent?.trim())).toEqual(['A:true', 'B'])
	})

	it('слоты элементов списка из items получают элемент через scope', () => {
		mount(() => (
			<ListBox
				items={ITEMS.slice(0, 2)}
				header={<i class="head">шапка</i>}
				footer={<i class="foot">подвал</i>}
				item={({ item }) => `[${item.text}]`}
				item-leading={({ item }) => <u class="lead">{String(item.value)}</u>}
				item-trailing={({ item }) => <s class="trail">{String(item.value)}</s>}
			/>
		))

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
	 * item itself. Nodes drawn by the list would lose the item's scope: the
	 * item holds `text` and `selected`.
	 */
	it('item получает text и selected элемента, selected следует за выбором', () => {
		mount(() => (
			<ListBox
				items={ITEMS.slice(0, 2)}
				item={({ item, text, selected }) =>
					`${String(item.value)}:${text}:${String(selected)}`
				}
			/>
		))

		expect(rows().map((row) => row.textContent?.trim())).toEqual([
			'a:Первый:false',
			'b:Второй:false',
		])

		rowOf('b:Второй:false').click()

		expect(rows().map((row) => row.textContent?.trim())).toEqual([
			'a:Первый:false',
			'b:Второй:true',
		])
	})

	/**
	 * The slot scope is live: a slot that read it in markup survives selection
	 * with the same nodes, so a button or a field in the item keeps focus.
	 */
	it('children элемента, читающий scope в разметке, — тот же узел после выбора', () => {
		mount(() => (
			<ListBox>
				<ListBox.Item value="a" text="A">
					{(scope) => (
						<b class="probe">
							{scope.text}:{String(scope.selected)}
						</b>
					)}
				</ListBox.Item>
			</ListBox>
		))
		const probe = find(document, '.probe', HTMLElement)

		rowOf('A:false').click()

		expect(find(document, '.probe', HTMLElement)).toBe(probe)
		expect(probe.textContent).toBe('A:true')
	})

	/** The relay merges the item's scope with the item as live fields: the same holds. */
	it('item списка, читающий scope в разметке, — те же узлы после выбора', () => {
		mount(() => (
			<ListBox
				items={ITEMS.slice(0, 2)}
				item={(scope) => (
					<b class="probe">
						{String(scope.item.value)}:{String(scope.selected)}
					</b>
				)}
			/>
		))
		const probes = [...document.querySelectorAll('.probe')]

		rowOf('b:false').click()

		expect([...document.querySelectorAll('.probe')]).toEqual(probes)
		expect(probes.map((probe) => probe.textContent)).toEqual(['a:false', 'b:true'])
	})

	/**
	 * The item sees an empty result of the relay and draws its own, as in Vue
	 * and React: the indicator for one item, the icon for the others.
	 */
	it('item-indicator-icon подменяет отметку одному элементу, у остальных — своя', () => {
		mount(() => (
			<ListBox
				items={ITEMS.slice(0, 2)}
				mode="multiple"
				indicator="start"
				item-indicator-icon={({ item, selected }) =>
					item.value === 'a' ? <b class="probe">{String(selected)}</b> : null
				}
			/>
		))
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

		rowAt(0).click()
		rowAt(1).click()

		expect(marks()).toEqual(['slot:true', 'icon'])
	})

	it('empty — пока элементов нет: в узле списка, между шапкой и подвалом; появились — пропал', () => {
		const [items, setItems] = createSignal<TItem[]>([])
		const { root } = mount(() => (
			<ListBox
				items={items()}
				header={<i class="head" />}
				empty={<p class="probe">Пусто</p>}
				footer={<i class="foot" />}
			/>
		))

		expect([...root().children].map((child) => child.className)).toEqual([
			'head',
			'so-list-box__list',
			'foot',
		])
		expect([...list().children].map((child) => child.className)).toEqual(['probe'])

		setItems(ITEMS.slice(0, 2))

		expect(document.querySelector('.probe')).toBeNull()
		expect(listItems()).toHaveLength(2)
	})

	/**
	 * Solid resolves the list's content once: the check for markup items does
	 * not draw a second instance.
	 */
	it('элементы разметки — по одному экземпляру, и в движке тоже', async () => {
		const engines: TEngineView[] = []
		const values = ['a', 'b']

		mount(() => (
			<ListBox onEngineCreate={(engine) => engines.push(engine)}>
				<For each={values}>{(value) => <ListBox.Item value={value} text={value} />}</For>
			</ListBox>
		))
		await flush()

		expect(listItems()).toHaveLength(2)
		expect(valuesOf(engines.at(-1))).toEqual(['a', 'b'])
	})
})

/**
 * Groups, as in Vue (`ui/vue/__tests__/list-groups.spec.ts`). From data: the
 * drawn sections (`drawnSections`) are a labelled group in `ListBox.Group`,
 * items without a group sit right in the list, and between sections, while
 * the list asks for them (`groupSeparators`, off by default), goes a silent
 * separator; groups from `groups` come first, the rest in place. In markup,
 * `ListBox.Group` joins the same grouping, and the sections describe it.
 * Arrows move in the order items stand on screen. The sections loop by
 * section key: a change of a group label or of the separators does not
 * recreate the items' nodes.
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
		mount(() => <ListBox items={MIXED} groups={GROUPS} />)

		expect(parts()).toEqual(SECTIONS)

		for (const group of list().querySelectorAll('.so-list-box-group')) {
			const label = find(group, '.so-list-box-group__label', HTMLElement)

			expect(group.getAttribute('role')).toBe('group')
			expect(group.getAttribute('aria-labelledby')).toBe(label.id)
			expect(label.id).not.toBe('')
			expect(label.getAttribute('role')).toBe('presentation')
		}
	})

	it('groupSeparators — немой разделитель между соседними секциями, на лету тоже, узлы элементов те же', () => {
		const [separated, setSeparated] = createSignal(true)

		mount(() => <ListBox items={MIXED} groups={GROUPS} groupSeparators={separated()} />)

		expect(parts()).toEqual(SEPARATED)
		expect(
			[...list().querySelectorAll('.so-list-box__separator')].map((node) =>
				node.getAttribute('aria-hidden'),
			),
		).toEqual(['true', 'true'])

		const before = listItems()

		setSeparated(false)

		expect(parts()).toEqual(SECTIONS)
		listItems().forEach((node, index) => expect(node).toBe(before[index]))
	})

	it('стрелки ходят порядком экрана: ↓ после «Яблока» — «Груша»', async () => {
		mount(() => <ListBox items={MIXED} groups={GROUPS} />)

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

	it('смена подписи в groups — новые подписи, узлы элементов те же', () => {
		const [groups, setGroups] = createSignal(GROUPS)

		mount(() => <ListBox items={MIXED} groups={groups()} />)

		const before = listItems()

		setGroups([
			{ key: 'fruit', label: 'Fruit' },
			{ key: 'veg', label: 'Vegetables' },
		])

		expect(parts()).toEqual([
			['Fruit', ['Яблоко', 'Груша']],
			['Vegetables', ['Морковь']],
			'Вода',
		])
		listItems().forEach((node, index) => expect(node).toBe(before[index]))
	})

	it('без группировки — ни групп, ни разделителей', () => {
		mount(() => <ListBox items={ITEMS} />)

		expect(parts()).toEqual(['Первый', 'Второй', 'Третий'])
	})

	/** «Вода» is above the «Фрукты» group, «Сок» below it: the groups are not declared. */
	function markup(engine: TListBoxCollection, label: () => string = () => 'Фрукты') {
		return () => (
			<ListBox engine={engine}>
				<ListBox.Item value="water" text="Вода" />
				<ListBox.Group label={label()}>
					<ListBox.Item value="apple" text="Яблоко" />
					<ListBox.Item value="pear" text="Груша" />
				</ListBox.Group>
				<ListBox.Item value="juice" text="Сок" />
			</ListBox>
		)
	}

	/** Sections in brief: the group label (`null` without a group) and the item values. */
	const brief = (engine: TListBoxCollection) =>
		engine.extensions.group.sections.map(({ group, items }) => [
			group === null ? null : (group.label ?? ''),
			items.map((item) => item.value),
		])

	it('группа разметки — в группировке: секции с подписью, элементы вне группы — на местах', () => {
		const engine = createEngineListBox()

		mount(markup(engine))

		expect(brief(engine)).toEqual([
			[null, ['water']],
			['Фрукты', ['apple', 'pear']],
			[null, ['juice']],
		])
		expect(parts()).toEqual(['Вода', ['Фрукты', ['Яблоко', 'Груша']], 'Сок'])
	})

	it('стрелки по группе разметки — порядком экрана: «Вода» над группой — первой', async () => {
		mount(markup(createEngineListBox()))

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
		const [label, setLabel] = createSignal('Фрукты')

		mount(markup(engine, label))

		setLabel('Ягоды')

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

	it('слоты несут scope из дескрипторов', () => {
		type TItemSlot = NonNullable<ListBoxProps['item']>
		type TChildren = NonNullable<ListBoxItemProps['children']>
		type TIndicator = NonNullable<ListBoxItemProps['indicator-icon']>

		expectTypeOf<
			(scope: { item: IListBoxItem; text: string; selected: boolean }) => JSX.Element
		>().toExtend<TItemSlot>()
		expectTypeOf<(scope: { item: IListBoxItem; selected: boolean }) => JSX.Element>().toExtend<
			NonNullable<ListBoxProps['item-indicator-icon']>
		>()
		expectTypeOf<
			(scope: { text: string; selected: boolean }) => JSX.Element
		>().toExtend<TChildren>()
		expectTypeOf<(scope: { selected: boolean }) => JSX.Element>().toExtend<TIndicator>()
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
 * The consumer hears nothing once the teardown began, as in the other
 * adapters: Solid cleans the children before the cleanups of the owner's
 * body, and the markup items leaving the collection sent `onChangeItems` with
 * an ever shorter list, so a consumer keeping it in its state lost the list
 * with the owner (benchmarks/parity/README.md).
 */
describe('события снятия', () => {
	it('владелец под Show уходит молча: длина списка у потребителя прежняя', () => {
		const [shown, setShown] = createSignal(true)
		const [count, setCount] = createSignal(0)
		const heard: string[] = []

		mount(() => (
			<Show when={shown()}>
				<ListBox
					onChangeItems={(items) => setCount(items.length)}
					onItemRemoved={() => heard.push('item:removed')}
					onElementRemoved={() => heard.push('element:removed')}
				>
					<ListBoxItem value="a" text="A" />
					<ListBoxItem value="b" text="B" />
				</ListBox>
			</Show>
		))

		expect(count()).toBe(2)

		setShown(false)

		expect(count()).toBe(2)
		expect(heard).toEqual([])
	})

	it('снятие корня — без событий', () => {
		const heard: string[] = []
		const { destroy } = mount(() => (
			<ListBox
				onChangeItems={(items) => heard.push(`items ${items.length}`)}
				onElementRemoved={() => heard.push('element:removed')}
			>
				<ListBoxItem value="a" text="A" />
			</ListBox>
		))
		const mounted = heard.length

		destroy()

		expect(heard.slice(mounted)).toEqual([])
	})
})

/**
 * Markup items hear nothing of their siblings going with the owner. Solid
 * cleans them one by one, and an item still listened to heard its order
 * change as the others left; the owner's `detach` detaches its collection's
 * members before any goes (`TCollectionMembers`).
 */
describe('события снятия элементов', () => {
	it('элементы разметки не слышат, как уходят соседи', () => {
		const [shown, setShown] = createSignal(true)
		const heard: string[] = []
		const item = (value: string) => (
			<ListBoxItem
				value={value}
				text={value}
				onChangeOrder={() => heard.push(`${value} order`)}
				onChangeAria={() => heard.push(`${value} aria`)}
			/>
		)

		mount(() => (
			<Show when={shown()}>
				<ListBox>
					{item('a')}
					{item('b')}
					{item('c')}
				</ListBox>
			</Show>
		))

		const mounted = heard.length

		setShown(false)

		expect(heard.slice(mounted)).toEqual([])
	})
})
