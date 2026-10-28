/**
 * ListBox under Angular: a list with selection on the collection engine.
 *
 * The scenarios are those of React (`list-box.spec.tsx`) and Vue: selection,
 * composition, the indicator and slots. The collection engine, its extensions
 * and plugins are shared unchanged.
 *
 * What is Angular's own is the markup. The root is the component's element
 * itself (`<div so-list-box>`), an item is `<div so-list-box-item>`: the
 * consumer's attributes are split between the root and the list node for the
 * list, between the root and the row for an item. Facade inputs (`items`,
 * `mode`, `engine`, an item's `selected`) are inputs of the same element.
 * Scoped slots are templates (`<ng-template slot="item" let-item="item">`),
 * and a template given to the list is drawn in every item instead of its own,
 * like a Svelte snippet: the item cannot see that it rendered nothing.
 *
 * A markup item joins the collection in its `ngOnInit`, after the list:
 * Angular calls hooks in template order, so items join in DOM order. The
 * elevator and two lists side by side are covered by
 * `collection-elevator.spec.ts`.
 */

import { describe, it, expect, expectTypeOf } from 'vitest'
import { Component, signal, type EventEmitter } from '@angular/core'
import type { ComponentFixture } from '@angular/core/testing'
import {
	createEngine,
	createEngineListBox,
	type IListBoxItem,
	type TListBoxCollection,
	type TListBoxValue,
	type TListIndicator,
	type TSelectionMode,
	type TValuePayload,
} from '@soldy-ui/core'
import {
	SlotDirective,
	TListBoxComponent,
	TListBoxGroupComponent,
	TListBoxItemComponent,
} from '@soldy-ui/angular'
import { find, findIn, mountHost, nextFrame } from './mount'

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

/** The list's root in the host markup. */
const rootOf = (fixture: ComponentFixture<unknown>) => findIn(fixture, '[so-list-box]', HTMLElement)

/** The list node inside the root: it carries the list's `aria` set and the Tab stop. */
const listOf = (fixture: ComponentFixture<unknown>) =>
	findIn(fixture, '[so-list-box] > .so-list-box__list', HTMLDivElement)

function click(fixture: ComponentFixture<unknown>, element: HTMLElement): void {
	element.click()
	fixture.detectChanges()
}

/** A key on a node as the browser sends it: bubbling and cancelable. */
function press(fixture: ComponentFixture<unknown>, target: Element, key: string): void {
	target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
	fixture.detectChanges()
}

/** Microtasks: the engine announces `engine:create` on them. */
const flush = (): Promise<void> => Promise.resolve()

/** The engine as the test sees it: the item composition. */
type TEngineView = { extensions: { batch: { items: readonly object[] } } }

/** "B" is disabled by the `itemOff` signal, the whole list by `listOff`. */
@Component({
	standalone: true,
	imports: [TListBoxComponent, TListBoxItemComponent],
	template: `<div
		so-list-box
		mode="multiple"
		[disabled]="listOff()"
		(soChangeValue)="changes.push($event)"
	>
		<div so-list-box-item value="a" text="A"></div>
		<div so-list-box-item value="b" text="B" [disabled]="itemOff()"></div>
	</div>`,
})
class Harness {
	readonly itemOff = signal(false)
	readonly listOff = signal(false)
	readonly changes: TValuePayload<TListBoxValue>[] = []
}

describe('выбор', () => {
	@Component({
		standalone: true,
		imports: [TListBoxComponent, TListBoxItemComponent],
		template: `<div so-list-box (soEngineCreate)="engines.push($event)">
			<div so-list-box-item value="a" text="A"></div>
			<div so-list-box-item value="b" text="B"></div>
			<div so-list-box-item value="c" text="C"></div>
		</div>`,
	})
	class OrderHost {
		readonly engines: TEngineView[] = []
	}

	it('элементы разметки входят в коллекцию в порядке DOM', async () => {
		const fixture = mountHost(OrderHost)

		await flush()

		const items = fixture.componentInstance.engines.at(-1)?.extensions.batch.items ?? []

		expect(items.map((item) => Reflect.get(item, 'value'))).toEqual(['a', 'b', 'c'])
	})

	it('клик по строке выбирает элемент, повторный — снимает, changeValue сообщает', () => {
		const fixture = mountHost(Harness)

		click(fixture, rowOf('B'))

		expect(selection()).toEqual(['false', 'true'])
		expect(fixture.componentInstance.changes.at(-1)?.newValue).toEqual(['b'])

		click(fixture, rowOf('B'))

		expect(selection()).toEqual(['false', 'false'])
		expect(fixture.componentInstance.changes).toHaveLength(2)
	})

	/**
	 * A disabled item is not selected by a click, whether it or the whole list
	 * is disabled. Enabled again, it is selected by the same click: so the
	 * handler is in place and the refusal comes from being disabled.
	 */
	it.each([
		['выключен сам', 'itemOff'],
		['выключен список', 'listOff'],
	] as const)('%s: клик не выбирает, после включения — выбирает', (_way, off) => {
		const fixture = mountHost(Harness)

		fixture.componentInstance[off].set(true)
		fixture.detectChanges()

		expect(rowOf('B').dataset['disabled']).toBe('true')

		click(fixture, rowOf('B'))

		expect(selection()).toEqual(['false', 'false'])

		fixture.componentInstance[off].set(false)
		fixture.detectChanges()
		click(fixture, rowOf('B'))

		expect(selection()).toEqual(['false', 'true'])
	})

	/**
	 * There is one Tab stop, the list node (APG Listbox); arrows move between
	 * items. The core writes an item's `tabindex="-1"` into its `aria`, and on
	 * the row it overrides the `tabindex="0"` a button on a `div` sets itself:
	 * the owner's set wins. The root is a frame around the header, the list
	 * and the footer, and is never a stop.
	 */
	it('строки — не остановки Tab, узел списка — остановка, корень — нет', () => {
		const fixture = mountHost(Harness)

		expect(listOf(fixture).parentElement).toBe(rootOf(fixture))
		expect(listOf(fixture).getAttribute('tabindex')).toBe('0')
		expect(rootOf(fixture).hasAttribute('tabindex')).toBe(false)
		expect(rows().map((row) => row.getAttribute('tabindex'))).toEqual(['-1', '-1'])
	})

	/**
	 * The core writes the roles: the list node is a `listbox`, with
	 * `aria-multiselectable` in `multiple`, a row is an `option`. The list's
	 * `aria` set goes on the node through the set directive, not on the root
	 * through the base. The item's set is the top layer of the row's
	 * attributes, so the `role="button"` a button on a `div` writes itself
	 * does not reach the markup.
	 */
	it('узел списка — listbox с aria-multiselectable, строки — опции, а не кнопки', () => {
		const fixture = mountHost(Harness)
		const list = listOf(fixture)

		expect(list.getAttribute('role')).toBe('listbox')
		expect(list.getAttribute('aria-multiselectable')).toBe('true')
		expect(rootOf(fixture).hasAttribute('role')).toBe(false)
		expect(rows().map((row) => row.getAttribute('role'))).toEqual(['option', 'option'])
		expect(document.querySelectorAll('.so-list-box-item [role="button"]')).toHaveLength(0)
	})

	it('стрелки ведут подсветку, Enter и пробел переключают выбор', async () => {
		const fixture = mountHost(Harness)
		const list = listOf(fixture)

		// The list's keyboard listens to the root from `element:ready`, a frame later
		await nextFrame()

		press(fixture, list, 'ArrowDown')

		expect(rows().map((row) => row.getAttribute('data-highlighted'))).toEqual(['true', 'false'])

		press(fixture, list, 'Enter')

		expect(selection()).toEqual(['true', 'false'])

		press(fixture, list, 'ArrowDown')
		press(fixture, list, ' ')

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
		const fixture = mountHost(Harness)
		const list = listOf(fixture)

		await nextFrame()

		const ids = rows().map((row) => row.id)

		expect(ids.every((id) => id !== '')).toBe(true)
		expect(new Set(ids).size).toBe(ids.length)
		expect(list.hasAttribute('aria-activedescendant')).toBe(false)

		for (const step of [0, 1]) {
			press(fixture, list, 'ArrowDown')

			const reference = list.getAttribute('aria-activedescendant')

			expect(reference).toBe(ids[step])
			expect(document.querySelector('[role="option"][data-highlighted="true"]')?.id).toBe(
				reference,
			)
			expect(document.querySelectorAll(`[id="${reference}"]`)).toHaveLength(1)
		}
	})

	/**
	 * An item's own `id` is its input: the static attribute and the `[id]`
	 * binding both write the input, the base takes the static one off the
	 * root, and the row gets `id` from the item's set, so the reference points
	 * at it and only one node has it. Before, the consumer's `id` went to the
	 * row as a static attribute, and the set the base considers its own erased
	 * it. Changed on the highlighted item, the row and the reference follow.
	 */
	it('свой id элемента — на строке, ссылка ведёт на него и идёт за его сменой', async () => {
		@Component({
			standalone: true,
			imports: [TListBoxComponent, TListBoxItemComponent],
			template: `<div so-list-box>
				<div so-list-box-item value="a" text="Первый" [id]="own()"></div>
				<div so-list-box-item value="b" text="Второй" id="row-second"></div>
			</div>`,
		})
		class OwnIdHost {
			readonly own = signal<string | undefined>('row-first')
		}

		const fixture = mountHost(OwnIdHost)
		const list = listOf(fixture)

		await nextFrame()
		press(fixture, list, 'ArrowDown')

		expect(rowOf('Первый').id).toBe('row-first')
		expect(rowOf('Второй').id).toBe('row-second')
		expect(list.getAttribute('aria-activedescendant')).toBe('row-first')
		expect(document.querySelectorAll('[id="row-first"]')).toHaveLength(1)
		expect(document.querySelectorAll('[id="row-second"]')).toHaveLength(1)
		expect(listItems().some((item) => item.hasAttribute('id'))).toBe(false)

		fixture.componentInstance.own.set('row-one')
		fixture.detectChanges()

		expect(rowOf('Первый').id).toBe('row-one')
		expect(list.getAttribute('aria-activedescendant')).toBe('row-one')

		fixture.componentInstance.own.set(undefined)
		fixture.detectChanges()

		const fallback = rowOf('Первый').id

		expect(fallback).not.toBe('')
		expect(fallback).not.toBe('row-one')
		expect(list.getAttribute('aria-activedescendant')).toBe(fallback)

		press(fixture, list, 'ArrowDown')

		expect(list.getAttribute('aria-activedescendant')).toBe('row-second')
	})

	/**
	 * ARIA allows only options inside a `listbox`, so the header and the footer
	 * are children of the root beside the list node. Their keys are not the
	 * list's: a field types, a button is pressed.
	 */
	it('шапка и подвал — вне listbox; их клавиши подсветку не двигают', async () => {
		@Component({
			standalone: true,
			imports: [TListBoxComponent, TListBoxItemComponent],
			template: `<div so-list-box>
				<input slot="header" class="so-test-header" />
				<div so-list-box-item value="a" text="A"></div>
				<button slot="footer" class="so-test-footer">Готово</button>
			</div>`,
		})
		class SlotsHost {}

		const fixture = mountHost(SlotsHost)
		const list = listOf(fixture)

		await nextFrame()

		const header = findIn(fixture, '.so-test-header', HTMLInputElement)
		const footer = findIn(fixture, '.so-test-footer', HTMLButtonElement)

		expect([...rootOf(fixture).children]).toEqual([header, list, footer])
		expect(list.contains(header)).toBe(false)
		expect(list.contains(footer)).toBe(false)

		press(fixture, header, 'ArrowDown')
		press(fixture, footer, 'ArrowDown')

		expect(rows().map((row) => row.getAttribute('data-highlighted'))).toEqual(['false'])
	})
})

/**
 * The consumer's attributes are split as for a field: class and style go to
 * the root frame, static markup attributes to the list node with the
 * `listbox` role. The name and `id` name the list, not a frame without a role.
 */
describe('атрибуты потребителя — узлу списка', () => {
	it('aria-label, id и data-* — на [role=listbox], не на корне; класс и стиль — на корне', () => {
		@Component({
			standalone: true,
			imports: [TListBoxComponent, TListBoxItemComponent],
			template: `<div
				so-list-box
				aria-label="Города"
				id="cities"
				data-testid="list"
				class="mine"
				style="color: red"
			>
				<div so-list-box-item value="a" text="A"></div>
			</div>`,
		})
		class NameHost {}

		const fixture = mountHost(NameHost)
		const root = rootOf(fixture)
		const list = findIn(fixture, '[role="listbox"]', HTMLDivElement)

		expect(list).toBe(listOf(fixture))
		expect(list.getAttribute('aria-label')).toBe('Города')
		expect(list.id).toBe('cities')
		expect(list.dataset['testid']).toBe('list')
		expect(
			['aria-label', 'id', 'data-testid'].filter((name) => root.hasAttribute(name)),
		).toEqual([])
		expect(root.classList.contains('mine')).toBe(true)
		expect(root.style.color).toBe('red')
		expect(list.classList.contains('mine')).toBe(false)
	})

	it('tabindex="-1" снимает список с остановок Tab', () => {
		@Component({
			standalone: true,
			imports: [TListBoxComponent, TListBoxItemComponent],
			template: `<div so-list-box tabindex="-1">
				<div so-list-box-item value="a" text="A"></div>
			</div>`,
		})
		class TabStopHost {}

		const fixture = mountHost(TabStopHost)

		expect(listOf(fixture).getAttribute('tabindex')).toBe('-1')
		expect(rootOf(fixture).hasAttribute('tabindex')).toBe(false)
	})

	it('dir от direction — на корне', () => {
		@Component({
			standalone: true,
			imports: [TListBoxComponent],
			template: `<div so-list-box direction="rtl" [items]="items"></div>`,
		})
		class DirectionHost {
			readonly items = ITEMS
		}

		const fixture = mountHost(DirectionHost)

		expect(rootOf(fixture).getAttribute('dir')).toBe('rtl')
		expect(listOf(fixture).hasAttribute('dir')).toBe(false)
	})
})

describe('состав', () => {
	@Component({
		standalone: true,
		imports: [TListBoxComponent],
		template: `<div so-list-box [items]="items" [value]="value()"></div>`,
	})
	class ItemsHost {
		readonly items = ITEMS
		readonly value = signal<string | undefined>(undefined)
	}

	it('список из items рисует элемент на каждый', () => {
		mountHost(ItemsHost)

		expect(rows().map((row) => row.textContent?.trim())).toEqual(['Первый', 'Второй', 'Третий'])
	})

	/**
	 * The facade is assembled by the constructor from the same inputs and has
	 * already written `items`: the binding does not write them again. The
	 * `items` setter without `trackBy` is a clear and a new set.
	 */
	it('items пишется один раз: без очистки и повторного добавления', () => {
		const engine = createEngine<TItem>()
		let resets = 0
		let added = 0

		engine.extensions.plain.events.on('reset', () => resets++)
		engine.extensions.plain.events.on('item:added', () => added++)

		@Component({
			standalone: true,
			imports: [TListBoxComponent],
			template: `<div so-list-box [engine]="engine" [items]="items"></div>`,
		})
		class EngineItemsHost {
			readonly engine = engine
			readonly items = ITEMS
		}

		mountHost(EngineItemsHost)

		expect(resets).toBe(0)
		expect(added).toBe(ITEMS.length)
		expect(rows()).toHaveLength(ITEMS.length)
	})

	it('engine снаружи: элементы движка рисуются, добавленное в него — тоже', () => {
		const engine = createEngine<TItem>({ items: ITEMS.slice(0, 2) })

		@Component({
			standalone: true,
			imports: [TListBoxComponent],
			template: `<div so-list-box [engine]="engine"></div>`,
		})
		class EngineHost {
			readonly engine = engine
		}

		const fixture = mountHost(EngineHost)

		expect(listItems()).toHaveLength(2)

		engine.extensions.batch.set([{ value: 'c', text: 'Третий' }])
		fixture.detectChanges()

		expect(listItems()).toHaveLength(3)
	})

	it('value от родителя выбирает элемент, и выбор следует за ним', () => {
		const fixture = mountHost(ItemsHost)

		fixture.componentInstance.value.set('b')
		fixture.detectChanges()

		expect(selection()).toEqual(['false', 'true', 'false'])

		fixture.componentInstance.value.set('c')
		fixture.detectChanges()

		expect(selection()).toEqual(['false', 'false', 'true'])
	})

	it('сузили shown — на экране меньше элементов, в коллекции все', () => {
		const engine = createEngine<TItem>({ items: ITEMS })

		@Component({
			standalone: true,
			imports: [TListBoxComponent],
			template: `<div so-list-box [engine]="engine"></div>`,
		})
		class ShownHost {
			readonly engine = engine
		}

		const fixture = mountHost(ShownHost)

		engine.getCore().driver.events.on('items:query:before', (e) => {
			e.items = e.items.filter((item) => item.value !== 'b')
		})
		engine.getCore().driver.invalidateQuery()
		fixture.detectChanges()

		expect(listItems()).toHaveLength(2)
		expect(engine.extensions.batch.items).toHaveLength(3)
	})

	/**
	 * Facade inputs (`mode`, `items`, `engine` of the list and `selected` of an
	 * item) are inputs of the same element and do not stay in the DOM as
	 * attributes. The consumer's attributes do: on the list node for the list,
	 * on the row for an item.
	 */
	it('входы фасада — не атрибуты, атрибуты потребителя — атрибуты', () => {
		@Component({
			standalone: true,
			imports: [TListBoxComponent, TListBoxItemComponent],
			template: `<div so-list-box mode="multiple" [items]="items" title="Города">
				<div so-list-box-item value="z" text="Z" selected title="Строка"></div>
			</div>`,
		})
		class AttributesHost {
			readonly items = ITEMS
		}

		const fixture = mountHost(AttributesHost)
		const root = rootOf(fixture)

		for (const name of ['mode', 'items', 'engine']) {
			expect(root.hasAttribute(name), name).toBe(false)
			expect(listOf(fixture).hasAttribute(name), name).toBe(false)
		}

		expect(root.hasAttribute('title')).toBe(false)
		expect(listOf(fixture).getAttribute('title')).toBe('Города')
		expect(rowOf('Z').hasAttribute('selected')).toBe(false)
		expect(find(document, '[so-list-box-item]', HTMLElement).hasAttribute('selected')).toBe(
			false,
		)
		expect(rowOf('Z').getAttribute('title')).toBe('Строка')
	})

	it('selected элемента разметки выбирает его при входе в коллекцию', () => {
		@Component({
			standalone: true,
			imports: [TListBoxComponent, TListBoxItemComponent],
			template: `<div so-list-box>
				<div so-list-box-item value="a" text="A"></div>
				<div so-list-box-item value="b" text="B" selected></div>
			</div>`,
		})
		class SelectedHost {}

		mountHost(SelectedHost)

		expect(selection()).toEqual(['false', 'true'])
	})

	/**
	 * `id` is an input of the item's `TIdPlugin`, not a static attribute moved
	 * to the row: the links plugin writes it into the row's set, and the
	 * list's `aria-activedescendant` takes the same `id`. The core does not
	 * name `title`, so the base moves it to the row as a static attribute.
	 */
	it('класс и стиль потребителя — корню элемента, остальное — строке', () => {
		@Component({
			standalone: true,
			imports: [TListBoxComponent, TListBoxItemComponent],
			template: `<div so-list-box>
				<div
					so-list-box-item
					value="a"
					text="A"
					class="mine"
					style="color: red"
					id="row-a"
					title="Строка"
				></div>
			</div>`,
		})
		class SplitHost {}

		mountHost(SplitHost)

		const item = find(document, '.so-list-box-item', HTMLElement)

		expect(item.classList.contains('mine')).toBe(true)
		expect(item.style.color).toBe('red')
		expect(item.hasAttribute('id')).toBe(false)
		expect(item.hasAttribute('title')).toBe(false)
		expect(rowOf('A').id).toBe('row-a')
		expect(rowOf('A').getAttribute('title')).toBe('Строка')
		expect(rowOf('A').classList.contains('mine')).toBe(false)
	})

	it('клик потребителя по элементу не отменяет выбор', () => {
		@Component({
			standalone: true,
			imports: [TListBoxComponent, TListBoxItemComponent],
			template: `<div so-list-box>
				<div so-list-box-item value="a" text="A" (click)="clicks = clicks + 1"></div>
			</div>`,
		})
		class ClickHost {
			clicks = 0
		}

		const fixture = mountHost(ClickHost)

		click(fixture, rowOf('A'))

		expect(fixture.componentInstance.clicks).toBe(1)
		expect(selection()).toEqual(['true'])
	})

	/** The item's place in the collection is a style of its root: the row is a flexbox. */
	it('корень элемента стоит по месту в коллекции', () => {
		mountHost(ItemsHost)

		expect(
			listItems().map((item) => (item instanceof HTMLElement ? item.style.order : '')),
		).toEqual(['0', '1', '2'])
	})
})

describe('отметка выбранного и слоты', () => {
	@Component({
		standalone: true,
		imports: [TListBoxComponent],
		template: `<div so-list-box [items]="items" [indicator]="indicator()" value="a"></div>`,
	})
	class IndicatorHost {
		readonly items = ITEMS
		readonly indicator = signal<TListIndicator | undefined>(undefined)
	}

	it('без indicator обёртки отметки нет', () => {
		mountHost(IndicatorHost)

		expect(document.querySelectorAll('.so-list-box-item__indicator')).toHaveLength(0)
	})

	/**
	 * Every item has the wrapper, unselected ones too: it reserves the space,
	 * or rows would jump on selection. The icon inside is only on the selected.
	 */
	it('обёртка — у каждого элемента, иконка — у выбранного, из дерева доступности убрана', () => {
		@Component({
			standalone: true,
			imports: [TListBoxComponent],
			template: `<div so-list-box [items]="items" indicator="start"></div>`,
		})
		class MarksHost {
			readonly items = ITEMS
		}

		const fixture = mountHost(MarksHost)

		expect(document.querySelectorAll('.so-list-box-item__indicator')).toHaveLength(3)
		expect(document.querySelectorAll('.so-list-box-item__indicator svg')).toHaveLength(0)

		click(fixture, rowOf('Второй'))

		expect(
			listItems().map((item) => !!item.querySelector('.so-list-box-item__indicator svg')),
		).toEqual([false, true, false])
		expect(
			find(document, '.so-list-box-item__indicator', HTMLElement).getAttribute('aria-hidden'),
		).toBe('true')
	})

	it('start ставит отметку перед текстом, end — после', () => {
		const fixture = mountHost(IndicatorHost)
		const sideOf = () => {
			const indicator = find(document, '.so-list-box-item__indicator', HTMLElement)
			const text = find(document, '.so-button__text', HTMLElement)

			return indicator.compareDocumentPosition(text) & Node.DOCUMENT_POSITION_FOLLOWING
				? 'start'
				: 'end'
		}

		fixture.componentInstance.indicator.set('start')
		fixture.detectChanges()

		expect(sideOf()).toBe('start')

		fixture.componentInstance.indicator.set('end')
		fixture.detectChanges()

		expect(sideOf()).toBe('end')
	})

	it('слот indicator-icon подменяет иконку и получает selected', () => {
		@Component({
			standalone: true,
			imports: [TListBoxComponent, TListBoxItemComponent, SlotDirective],
			template: `<div so-list-box indicator="start">
				<div so-list-box-item value="a" text="A">
					<ng-template slot="indicator-icon" let-selected="selected">
						@if (selected) {
							<b class="custom">V</b>
						}
					</ng-template>
				</div>
			</div>`,
		})
		class IndicatorSlotHost {}

		const fixture = mountHost(IndicatorSlotHost)

		expect(document.querySelector('.custom')).toBeNull()
		// The slot template is not the row's content: the item's text is in place
		expect(rowOf('A').textContent?.trim()).toBe('A')

		click(fixture, rowOf('A'))

		expect(document.querySelector('.so-list-box-item__indicator .custom')).not.toBeNull()
		expect(document.querySelector('.so-list-box-item__indicator svg')).toBeNull()
	})

	it('default элемента — проекцией или шаблоном с text и selected, без него — text', () => {
		@Component({
			standalone: true,
			imports: [TListBoxComponent, TListBoxItemComponent, SlotDirective],
			template: `<div so-list-box>
				<div so-list-box-item value="a" text="A">
					<ng-template slot="default" let-text="text" let-selected="selected"
						>{{ text }}:{{ selected }}</ng-template
					>
				</div>
				<div so-list-box-item value="b" text="B"></div>
				<div so-list-box-item value="c" text="C">Свой</div>
			</div>`,
		})
		class DefaultSlotHost {}

		const fixture = mountHost(DefaultSlotHost)

		expect(rows().map((row) => row.textContent?.trim())).toEqual(['A:false', 'B', 'Свой'])

		click(fixture, rowOf('A:false'))

		expect(rows().map((row) => row.textContent?.trim())).toEqual(['A:true', 'B', 'Свой'])
	})

	it('слоты элементов списка из items получают элемент через scope', () => {
		@Component({
			standalone: true,
			imports: [TListBoxComponent, SlotDirective],
			template: `<div so-list-box [items]="items">
				<i slot="header" class="head">шапка</i>
				<i slot="footer" class="foot">подвал</i>
				<ng-template slot="item" let-item="item">[{{ item.text }}]</ng-template>
				<ng-template slot="item-leading" let-item="item"
					><u class="lead">{{ item.value }}</u></ng-template
				>
				<ng-template slot="item-trailing" let-item="item"
					><s class="trail">{{ item.value }}</s></ng-template
				>
			</div>`,
		})
		class RelayHost {
			readonly items = ITEMS.slice(0, 2)
		}

		mountHost(RelayHost)

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
	 * item itself. The item holds `text` and `selected`, and selection reaches
	 * the template.
	 */
	it('item получает text и selected элемента, selected следует за выбором', () => {
		@Component({
			standalone: true,
			imports: [TListBoxComponent, SlotDirective],
			template: `<div so-list-box [items]="items">
				<ng-template slot="item" let-item="item" let-text="text" let-selected="selected"
					>{{ item.value }}:{{ text }}:{{ selected }}</ng-template
				>
			</div>`,
		})
		class ScopeHost {
			readonly items = ITEMS.slice(0, 2)
		}

		const fixture = mountHost(ScopeHost)

		expect(rows().map((row) => row.textContent?.trim())).toEqual([
			'a:Первый:false',
			'b:Второй:false',
		])

		click(fixture, rowOf('b:Второй:false'))

		expect(rows().map((row) => row.textContent?.trim())).toEqual([
			'a:Первый:false',
			'b:Второй:true',
		])
	})

	/**
	 * A template is opaque: the item cannot see what it drew, so a template
	 * given to the list is drawn in every item instead of its own indicator,
	 * like a Svelte snippet. In React an empty render gives way to the own one.
	 */
	it('item-indicator-icon задан — у каждого элемента вместо своей отметки', () => {
		@Component({
			standalone: true,
			imports: [TListBoxComponent, SlotDirective],
			template: `<div so-list-box [items]="items" mode="multiple" indicator="start">
				<ng-template slot="item-indicator-icon" let-item="item" let-selected="selected">
					@if (item.value === 'a') {
						<b class="probe">{{ selected }}</b>
					}
				</ng-template>
			</div>`,
		})
		class RelayIndicatorHost {
			readonly items = ITEMS.slice(0, 2)
		}

		const fixture = mountHost(RelayIndicatorHost)
		const marks = () =>
			[...document.querySelectorAll('.so-list-box-item__indicator')].map((indicator) =>
				indicator.querySelector('.probe')
					? `slot:${indicator.textContent?.trim() ?? ''}`
					: indicator.querySelector('svg')
						? 'icon'
						: 'empty',
			)
		// The indicator's text is part of the row's text: take the rows by position
		const rowAt = (index: number) => find(listItems()[index], '.so-button', HTMLElement)

		expect(marks()).toEqual(['slot:false', 'empty'])

		click(fixture, rowAt(0))
		click(fixture, rowAt(1))

		expect(marks()).toEqual(['slot:true', 'empty'])
	})

	it('empty — пока элементов нет: в узле списка, между шапкой и подвалом; появились — пропал', () => {
		@Component({
			standalone: true,
			imports: [TListBoxComponent],
			template: `<div so-list-box [items]="items()">
				<i slot="header" class="head"></i>
				<p slot="empty" class="probe">Пусто</p>
				<i slot="footer" class="foot"></i>
			</div>`,
		})
		class EmptyHost {
			readonly items = signal<TItem[]>([])
		}

		const fixture = mountHost(EmptyHost)

		expect([...rootOf(fixture).children].map((child) => child.className)).toEqual([
			'head',
			'so-list-box__list',
			'foot',
		])
		expect([...listOf(fixture).children].map((child) => child.className)).toEqual(['probe'])

		fixture.componentInstance.items.set(ITEMS.slice(0, 2))
		fixture.detectChanges()

		expect(document.querySelector('.probe')).toBeNull()
		expect(listItems()).toHaveLength(2)
	})
})

/**
 * Groups, as in Vue (`ui/vue/__tests__/list-groups.spec.ts`). From data: the
 * drawn sections (`drawnSections`) are a labelled group in
 * `<div so-list-box-group>`, items without a group sit right in the list, and
 * between sections, while the list asks for them (`groupSeparators`, off by
 * default), goes a silent separator; groups from `groups` come first, the
 * rest in place. Items in a group come from the list's template and still
 * see the list's elevator layer inside the group. In markup,
 * `<div so-list-box-group>` joins the same grouping with its elevator layer,
 * and the sections describe it. Arrows move in the order items stand on
 * screen.
 */
describe('группы', () => {
	/** In the data «Морковь» stands between the fruits, «Вода» has no group. */
	const MIXED = [
		{ value: 'apple', text: 'Яблоко', _: { group: 'fruit' } },
		{ value: 'carrot', text: 'Морковь', _: { group: 'veg' } },
		{ value: 'water', text: 'Вода' },
		{ value: 'pear', text: 'Груша', _: { group: 'fruit' } },
	]

	/** The sections of `MIXED` on screen, without and with separators. */
	const SECTIONS = [['Фрукты', ['Яблоко', 'Груша']], ['Овощи', ['Морковь']], 'Вода']
	const SEPARATED = [['Фрукты', ['Яблоко', 'Груша']], '—', ['Овощи', ['Морковь']], '—', 'Вода']

	@Component({
		standalone: true,
		imports: [TListBoxComponent],
		template: `<div so-list-box [items]="items" [groups]="groups()"></div>`,
	})
	class GroupsHost {
		readonly items = MIXED
		readonly groups = signal([
			{ key: 'fruit', label: 'Фрукты' },
			{ key: 'veg', label: 'Овощи' },
		])
	}

	@Component({
		standalone: true,
		imports: [TListBoxComponent],
		template: `<div
			so-list-box
			[items]="items"
			[groups]="groups"
			[groupSeparators]="separated()"
		></div>`,
	})
	class SeparatedHost {
		readonly items = MIXED
		readonly groups = [
			{ key: 'fruit', label: 'Фрукты' },
			{ key: 'veg', label: 'Овощи' },
		]
		readonly separated = signal(true)
	}

	/** The list's parts: a group as its label and item texts, a separator as `—`. */
	const parts = (fixture: ComponentFixture<unknown>) =>
		[...listOf(fixture).children].map((node) => {
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

	it('группа с подписью, без группы — последними; разделителей по умолчанию нет', () => {
		const fixture = mountHost(GroupsHost)

		expect(parts(fixture)).toEqual(SECTIONS)

		for (const group of listOf(fixture).querySelectorAll('.so-list-box-group')) {
			const label = find(group, '.so-list-box-group__label', HTMLElement)

			expect(group.getAttribute('role')).toBe('group')
			expect(group.getAttribute('aria-labelledby')).toBe(label.id)
			expect(label.id).not.toBe('')
			expect(label.getAttribute('role')).toBe('presentation')
		}

		// The group's items are in the list's collection: selection writes their `aria-selected`
		expect(selection()).toEqual(['false', 'false', 'false', 'false'])
	})

	it('groupSeparators — немой разделитель между соседними секциями, на лету тоже', () => {
		const fixture = mountHost(SeparatedHost)

		expect(parts(fixture)).toEqual(SEPARATED)
		expect(
			[...listOf(fixture).querySelectorAll('.so-list-box__separator')].map((node) =>
				node.getAttribute('aria-hidden'),
			),
		).toEqual(['true', 'true'])

		fixture.componentInstance.separated.set(false)
		fixture.detectChanges()

		expect(parts(fixture)).toEqual(SECTIONS)
	})

	it('стрелки ходят порядком экрана: ↓ после «Яблока» — «Груша»', async () => {
		const fixture = mountHost(GroupsHost)
		const list = listOf(fixture)

		await nextFrame()

		const highlighted = () =>
			rows()
				.find((row) => row.getAttribute('data-highlighted') === 'true')
				?.textContent?.trim()

		press(fixture, list, 'ArrowDown')
		expect(highlighted()).toBe('Яблоко')

		press(fixture, list, 'ArrowDown')
		expect(highlighted()).toBe('Груша')

		press(fixture, list, 'ArrowDown')
		expect(highlighted()).toBe('Морковь')
	})

	it('смена подписи в groups перерисовывает подписи групп', () => {
		const fixture = mountHost(GroupsHost)

		fixture.componentInstance.groups.set([
			{ key: 'fruit', label: 'Fruit' },
			{ key: 'veg', label: 'Vegetables' },
		])
		fixture.detectChanges()

		expect(parts(fixture)).toEqual([
			['Fruit', ['Яблоко', 'Груша']],
			['Vegetables', ['Морковь']],
			'Вода',
		])
	})

	/** «Вода» is above the «Фрукты» group, «Сок» below it: the groups are not declared. */
	@Component({
		standalone: true,
		imports: [TListBoxComponent, TListBoxItemComponent, TListBoxGroupComponent],
		template: `<div so-list-box [engine]="engine">
			<div so-list-box-item value="water" text="Вода"></div>
			<div so-list-box-group [label]="label()">
				<div so-list-box-item value="apple" text="Яблоко"></div>
				<div so-list-box-item value="pear" text="Груша"></div>
			</div>
			<div so-list-box-item value="juice" text="Сок"></div>
		</div>`,
	})
	class MarkupHost {
		readonly engine = createEngineListBox()
		readonly label = signal('Фрукты')
	}

	/** Sections in brief: the group label (`null` without a group) and the item values. */
	const brief = (engine: TListBoxCollection) =>
		engine.extensions.group.sections.map(({ group, items }) => [
			group === null ? null : (group.label ?? ''),
			items.map((item) => item.value),
		])

	it('группа разметки — в группировке: секции с подписью, элементы вне группы — на местах', () => {
		const fixture = mountHost(MarkupHost)

		expect(brief(fixture.componentInstance.engine)).toEqual([
			[null, ['water']],
			['Фрукты', ['apple', 'pear']],
			[null, ['juice']],
		])
		expect(parts(fixture)).toEqual(['Вода', ['Фрукты', ['Яблоко', 'Груша']], 'Сок'])
	})

	it('стрелки по группе разметки — порядком экрана: «Вода» над группой — первой', async () => {
		const fixture = mountHost(MarkupHost)
		const list = listOf(fixture)

		await nextFrame()

		const highlighted = () =>
			rows()
				.find((row) => row.getAttribute('data-highlighted') === 'true')
				?.textContent?.trim()
		const visited: unknown[] = []

		for (let step = 0; step < 4; step += 1) {
			press(fixture, list, 'ArrowDown')
			visited.push(highlighted())
		}

		expect(visited).toEqual(['Вода', 'Яблоко', 'Груша', 'Сок'])
	})

	it('смена подписи группы разметки — новая подпись секции', () => {
		const fixture = mountHost(MarkupHost)

		fixture.componentInstance.label.set('Ягоды')
		fixture.detectChanges()

		expect(brief(fixture.componentInstance.engine)[1]).toEqual(['Ягоды', ['apple', 'pear']])
	})
})

describe('типы', () => {
	it('входы фасада — по типам пропсов ядра', () => {
		expectTypeOf<TListBoxComponent['value']>().toEqualTypeOf<TListBoxValue | undefined>()
		expectTypeOf<TListBoxItemComponent['selected']>().toEqualTypeOf<boolean | undefined>()
		expectTypeOf<NonNullable<TListBoxComponent['items']>>().toExtend<readonly unknown[]>()
	})

	it('выходы фасада — выходы компонента', () => {
		expectTypeOf<TListBoxComponent['soChangeMode']>().toEqualTypeOf<
			EventEmitter<TSelectionMode>
		>()
		expectTypeOf<TListBoxComponent>().toHaveProperty('soEngineCreate')
		// An item's selection is a value: the output comes to the item whose selection changed
		expectTypeOf<TListBoxItemComponent['soChangeSelected']>().toEqualTypeOf<
			EventEmitter<boolean>
		>()
		expectTypeOf<TListBoxItemComponent['soChangeOrder']>().toEqualTypeOf<
			EventEmitter<undefined>
		>()
	})

	it('строка элемента — элемент коллекции списка', () => {
		expectTypeOf<IListBoxItem>().toHaveProperty('text')
	})
})

/**
 * A removed list goes silently, its items too. Angular destroys a removed
 * subtree children first, so the owner heard its items leave one by one, and
 * an item heard its siblings. But Angular takes the subtree out of the
 * document first, and a placed component out of the document sends nothing
 * (`TComponentBase`), like a Web Components element.
 */
describe('события снятия', () => {
	it('список и его элементы под @if уходят молча', async () => {
		@Component({
			imports: [TListBoxComponent, TListBoxItemComponent],
			template: `
				@if (shown()) {
					<div
						so-list-box
						(soChangeItems)="heard.push('items')"
						(soItemRemoved)="heard.push('item:removed')"
					>
						@for (item of items; track item.value) {
							<div
								so-list-box-item
								[value]="item.value"
								[text]="item.text"
								(soChangeOrder)="heard.push(item.value + ' order')"
								(soChangeAria)="heard.push(item.value + ' aria')"
							></div>
						}
					</div>
				}
			`,
		})
		class Host {
			readonly shown = signal(true)
			readonly items = ITEMS
			readonly heard: string[] = []
		}

		const fixture = mountHost(Host)

		await nextFrame()
		fixture.detectChanges()

		const { heard } = fixture.componentInstance
		const mounted = heard.length

		expect(mounted).toBeGreaterThan(0)

		fixture.componentInstance.shown.set(false)
		fixture.detectChanges()

		expect(heard.slice(mounted)).toEqual([])
	})
})
