/**
 * ListBox под Angular — список с выбором на движке коллекций.
 *
 * Сценарии — те же, что у React (`list-box.spec.tsx`) и Vue: выбор, состав,
 * отметка и слоты. Движок коллекций, его расширения и плагины перенесены без
 * правок.
 *
 * Своё у Angular — разметка. Корень — элемент потребителя
 * (`<div so-list-box>`), элемент — `<so-list-box-item>`: атрибуты потребителя
 * у него делятся между корнем и строкой. Входы фасада (`items`, `mode`,
 * `engine`, `selected` элемента) — входы того же элемента. Слоты со scope —
 * шаблоны (`<ng-template slot="item" let-item="item">`), и шаблон, заданный
 * списку, рисуется у каждого элемента вместо своего — как сниппет у Svelte:
 * пустоту его отрисовки элемент не видит.
 *
 * Элемент разметки входит в коллекцию в своём `ngOnInit`, после списка, —
 * Angular зовёт хуки в порядке шаблона, и элементы входят в порядке DOM. Лифт и
 * два списка рядом проверяет `collection-elevator.spec.ts`.
 */

import { describe, it, expect, expectTypeOf } from 'vitest'
import { Component, signal, type EventEmitter } from '@angular/core'
import type { ComponentFixture } from '@angular/core/testing'
import {
	createEngine,
	type IListBoxItem,
	type TListBoxValue,
	type TListIndicator,
	type TSelectionMode,
	type TValuePayload,
} from '@soldy-ui/core'
import { SlotDirective, TListBoxComponent, TListBoxItemComponent } from '@soldy-ui/angular'
import { find, findIn, mountHost, nextFrame } from './mount'

type TItem = { value: string; text: string }

const ITEMS: TItem[] = [
	{ value: 'a', text: 'Первый' },
	{ value: 'b', text: 'Второй' },
	{ value: 'c', text: 'Третий' },
]

/** Строки элементов — на них обработчик выбора, `aria-selected` и `tabindex`. */
const rows = () => [...document.querySelectorAll('.s-list-box-item .s-button')]

/** Строка элемента по тексту; нет её — тест падает здесь. */
function rowOf(text: string): HTMLElement {
	const row = rows().find((candidate) => candidate.textContent?.trim() === text)

	if (!(row instanceof HTMLElement)) throw new Error(`строки элемента «${text}» нет`)

	return row
}

/** `aria-selected` всех строк по порядку. */
const selection = () => rows().map((row) => row.getAttribute('aria-selected'))

const listItems = () => [...document.querySelectorAll('.s-list-box-item')]

/** Корень списка в разметке хоста. */
const rootOf = (fixture: ComponentFixture<unknown>) =>
	findIn(fixture, '[so-list-box]', HTMLDivElement)

function click(fixture: ComponentFixture<unknown>, element: HTMLElement): void {
	element.click()
	fixture.detectChanges()
}

/** Клавиша на узле — как её шлёт браузер: всплывает и отменяется. */
function press(fixture: ComponentFixture<unknown>, target: Element, key: string): void {
	target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
	fixture.detectChanges()
}

/** Микрозадачи: `engine:create` движок объявляет на них. */
const flush = (): Promise<void> => Promise.resolve()

/** Движок так, как его видит тест: состав элементов по значениям. */
type TEngineView = { extensions: { batch: { items: readonly object[] } } }

/** «B» выключается сигналом `itemOff`, весь список — `listOff`. */
@Component({
	standalone: true,
	imports: [TListBoxComponent, TListBoxItemComponent],
	template: `<div
		so-list-box
		mode="multiple"
		[disabled]="listOff()"
		(soChangeValue)="changes.push($event)"
	>
		<so-list-box-item value="a" text="A" />
		<so-list-box-item value="b" text="B" [disabled]="itemOff()" />
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
			<so-list-box-item value="a" text="A" />
			<so-list-box-item value="b" text="B" />
			<so-list-box-item value="c" text="C" />
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
	 * Выключенный элемент кликом не выбирается — выключен ли он сам или весь
	 * список. Включённый обратно — выбирается тем же кликом: так видно, что
	 * обработчик на месте и отказ даёт именно выключенность.
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
	 * Roving tabindex (APG listbox): Tab фокусирует контейнер, а по элементам
	 * ходят стрелки. `tabindex="-1"` элемента пишет ядро в его `aria`, и на
	 * строке он перекрывает `tabindex="0"`, который кнопка на `div` ставит себе
	 * сама: набор владельца главнее.
	 */
	it('строки — не остановки Tab, контейнер — остановка', () => {
		const fixture = mountHost(Harness)

		expect(rootOf(fixture).getAttribute('tabindex')).toBe('0')
		expect(rows().map((row) => row.getAttribute('tabindex'))).toEqual(['-1', '-1'])
	})

	it('стрелки ведут подсветку, Enter и пробел переключают выбор', async () => {
		const fixture = mountHost(Harness)
		const root = rootOf(fixture)

		// Клавиатура списка слушает корень с `element:ready` — через кадр
		await nextFrame()

		press(fixture, root, 'ArrowDown')

		expect(rows().map((row) => row.getAttribute('data-highlighted'))).toEqual(['true', 'false'])

		press(fixture, root, 'Enter')

		expect(selection()).toEqual(['true', 'false'])

		press(fixture, root, 'ArrowDown')
		press(fixture, root, ' ')

		expect(selection()).toEqual(['true', 'true'])
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
	 * Фасад собирается конструктором из тех же входов, и `items` он уже
	 * записал: связка второй раз их не пишет. Сеттер `items` без `trackBy` —
	 * это очистка и новый набор.
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
	 * Входы фасада — `mode`, `items`, `engine` у списка и `selected` у
	 * элемента — входы того же элемента, атрибутами в DOM они не остаются.
	 * Атрибуты потребителя остаются: у списка — на корне, у элемента — на
	 * строке.
	 */
	it('входы фасада — не атрибуты, атрибуты потребителя — атрибуты', () => {
		@Component({
			standalone: true,
			imports: [TListBoxComponent, TListBoxItemComponent],
			template: `<div so-list-box mode="multiple" [items]="items" title="Города">
				<so-list-box-item value="z" text="Z" selected title="Строка" />
			</div>`,
		})
		class AttributesHost {
			readonly items = ITEMS
		}

		const root = rootOf(mountHost(AttributesHost))

		for (const name of ['mode', 'items', 'engine']) {
			expect(root.hasAttribute(name), name).toBe(false)
		}

		expect(root.getAttribute('title')).toBe('Города')
		expect(rowOf('Z').hasAttribute('selected')).toBe(false)
		expect(find(document, 'so-list-box-item', HTMLElement).hasAttribute('selected')).toBe(false)
		expect(rowOf('Z').getAttribute('title')).toBe('Строка')
	})

	it('selected элемента разметки выбирает его при входе в коллекцию', () => {
		@Component({
			standalone: true,
			imports: [TListBoxComponent, TListBoxItemComponent],
			template: `<div so-list-box>
				<so-list-box-item value="a" text="A" />
				<so-list-box-item value="b" text="B" selected />
			</div>`,
		})
		class SelectedHost {}

		mountHost(SelectedHost)

		expect(selection()).toEqual(['false', 'true'])
	})

	it('класс и стиль потребителя — корню элемента, остальное — строке', () => {
		@Component({
			standalone: true,
			imports: [TListBoxComponent, TListBoxItemComponent],
			template: `<div so-list-box>
				<so-list-box-item value="a" text="A" class="mine" style="color: red" id="row-a" />
			</div>`,
		})
		class SplitHost {}

		mountHost(SplitHost)

		const item = find(document, '.s-list-box-item', HTMLElement)

		expect(item.classList.contains('mine')).toBe(true)
		expect(item.style.color).toBe('red')
		expect(item.hasAttribute('id')).toBe(false)
		expect(rowOf('A').id).toBe('row-a')
		expect(rowOf('A').classList.contains('mine')).toBe(false)
	})

	it('клик потребителя по элементу не отменяет выбор', () => {
		@Component({
			standalone: true,
			imports: [TListBoxComponent, TListBoxItemComponent],
			template: `<div so-list-box>
				<so-list-box-item value="a" text="A" (click)="clicks = clicks + 1" />
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

	/** Место элемента в коллекции — стилем корня: ряд — флексбокс. */
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

		expect(document.querySelectorAll('.s-list-box-item__indicator')).toHaveLength(0)
	})

	/**
	 * Обёртка стоит у всех, включая невыбранных: она резервирует место, иначе
	 * строки прыгали бы при выборе. Иконка внутри — только у выбранного.
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

		expect(document.querySelectorAll('.s-list-box-item__indicator')).toHaveLength(3)
		expect(document.querySelectorAll('.s-list-box-item__indicator svg')).toHaveLength(0)

		click(fixture, rowOf('Второй'))

		expect(
			listItems().map((item) => !!item.querySelector('.s-list-box-item__indicator svg')),
		).toEqual([false, true, false])
		expect(
			find(document, '.s-list-box-item__indicator', HTMLElement).getAttribute('aria-hidden'),
		).toBe('true')
	})

	it('start ставит отметку перед текстом, end — после', () => {
		const fixture = mountHost(IndicatorHost)
		const sideOf = () => {
			const indicator = find(document, '.s-list-box-item__indicator', HTMLElement)
			const text = find(document, '.s-button__text', HTMLElement)

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
				<so-list-box-item value="a" text="A">
					<ng-template slot="indicator-icon" let-selected="selected">
						@if (selected) {
							<b class="custom">V</b>
						}
					</ng-template>
				</so-list-box-item>
			</div>`,
		})
		class IndicatorSlotHost {}

		const fixture = mountHost(IndicatorSlotHost)

		expect(document.querySelector('.custom')).toBeNull()
		// Шаблон слота — не содержимое строки: текст элемента на месте
		expect(rowOf('A').textContent?.trim()).toBe('A')

		click(fixture, rowOf('A'))

		expect(document.querySelector('.s-list-box-item__indicator .custom')).not.toBeNull()
		expect(document.querySelector('.s-list-box-item__indicator svg')).toBeNull()
	})

	it('default элемента — проекцией или шаблоном с text и selected, без него — text', () => {
		@Component({
			standalone: true,
			imports: [TListBoxComponent, TListBoxItemComponent, SlotDirective],
			template: `<div so-list-box>
				<so-list-box-item value="a" text="A">
					<ng-template slot="default" let-text="text" let-selected="selected"
						>{{ text }}:{{ selected }}</ng-template
					>
				</so-list-box-item>
				<so-list-box-item value="b" text="B" />
				<so-list-box-item value="c" text="C">Свой</so-list-box-item>
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

		expect(rows().map((row) => row.querySelector('.s-button__text')?.textContent)).toEqual([
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
	 * Проброс целиком: scope `item` — scope слота элемента плюс сам элемент.
	 * `text` и `selected` держит элемент, и выбор доходит до шаблона.
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
	 * Шаблон непрозрачен: что он нарисовал, элемент не видит, — и шаблон,
	 * заданный списку, рисуется у каждого элемента вместо своей отметки, как
	 * сниппет у Svelte. У React пустая отрисовка уступает место своей.
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
			[...document.querySelectorAll('.s-list-box-item__indicator')].map((indicator) =>
				indicator.querySelector('.probe')
					? `slot:${indicator.textContent?.trim() ?? ''}`
					: indicator.querySelector('svg')
						? 'icon'
						: 'empty',
			)
		// Текст отметки входит в текст строки — строки берём по месту
		const rowAt = (index: number) => find(listItems()[index], '.s-button', HTMLElement)

		expect(marks()).toEqual(['slot:false', 'empty'])

		click(fixture, rowAt(0))
		click(fixture, rowAt(1))

		expect(marks()).toEqual(['slot:true', 'empty'])
	})

	it('empty — пока элементов нет: после шапки, перед подвалом; появились — пропал', () => {
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
			'probe',
			'foot',
		])

		fixture.componentInstance.items.set(ITEMS.slice(0, 2))
		fixture.detectChanges()

		expect(document.querySelector('.probe')).toBeNull()
		expect(listItems()).toHaveLength(2)
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
		expectTypeOf<TListBoxItemComponent['soChangeSelected']>().toEqualTypeOf<
			EventEmitter<undefined>
		>()
		expectTypeOf<TListBoxItemComponent['soChangeOrder']>().toEqualTypeOf<
			EventEmitter<undefined>
		>()
	})

	it('строка элемента — элемент коллекции списка', () => {
		expectTypeOf<IListBoxItem>().toHaveProperty('text')
	})
})
