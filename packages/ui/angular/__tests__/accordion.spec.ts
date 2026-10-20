/**
 * Accordion под Angular — раскрывающиеся секции на движке коллекций.
 *
 * Сценарии — те же, что у React (`accordion.spec.tsx`) и Vue (`accordion`,
 * `accordion-mode`): связка «заголовок ↔ панель», `aria-expanded` на
 * заголовке, режим нескольких раскрытых секций. Клавиатуры у аккордеона своей
 * нет: заголовок — нативная кнопка.
 *
 * Своё у Angular — разметка. Секция — `<div so-accordion-item>`, атрибуты
 * потребителя у неё делятся между корнем и заголовком. Слоты, по которым
 * секция решает, рисовать ли обёртку стрелки (`leading-icon`,
 * `trailing-icon`), — шаблоны, и шаблон, заданный аккордеону, рисуется у
 * каждой секции, как сниппет у Svelte.
 */

import { describe, it, expect, expectTypeOf } from 'vitest'
import { Component, signal, type EventEmitter } from '@angular/core'
import type { ComponentFixture } from '@angular/core/testing'
import type { TAccordionArrowPlacement, TSelectionMode } from '@soldy-ui/core'
import { SlotDirective, TAccordionComponent, TAccordionItemComponent } from '@soldy-ui/angular'
import { find, mountHost } from './mount'

const headers = () => [...document.querySelectorAll('.so-accordion-item__header')]

const contents = () => [...document.querySelectorAll('.so-accordion-item__content')]

const sections = () => [...document.querySelectorAll('.so-accordion-item')]

/** Заголовок секции по тексту; нет его — тест падает здесь. */
function header(text: string): HTMLElement {
	const found = headers().find((candidate) => candidate.textContent?.trim() === text)

	if (!(found instanceof HTMLElement)) throw new Error(`секции «${text}» нет`)

	return found
}

function click(fixture: ComponentFixture<unknown>, element: HTMLElement): void {
	element.click()
	fixture.detectChanges()
}

/** Секции из разметки — как `Accordion.test.vue` у Vue. */
@Component({
	standalone: true,
	imports: [TAccordionComponent, TAccordionItemComponent],
	template: `<div so-accordion [mode]="mode()" (soChangeSelection)="selections = selections + 1">
		<div so-accordion-item text="Первый" value="a" selected><p>Содержимое A</p></div>
		<div so-accordion-item text="Второй" value="b"><p>Содержимое B</p></div>
	</div>`,
})
class Harness {
	readonly mode = signal<TSelectionMode>('multiple')
	selections = 0
}

describe('связка ARIA заголовок ↔ панель', () => {
	it('aria-controls заголовка указывает на id панели, aria-labelledby — обратно', () => {
		mountHost(Harness)

		const [first] = headers()
		const [content] = contents()

		expect(first.getAttribute('aria-controls')).toBe(content.id)
		expect(content.getAttribute('aria-labelledby')).toBe(first.id)
	})

	it('панель объявлена как region', () => {
		mountHost(Harness)

		expect(contents()[0].getAttribute('role')).toBe('region')
	})

	it('id уникальны между элементами', () => {
		mountHost(Harness)

		const [first, second] = contents()

		expect(first.id).not.toBe(second.id)
	})

	it('содержимое секции — в её панели', () => {
		mountHost(Harness)

		expect(contents().map((content) => content.textContent)).toEqual([
			'Содержимое A',
			'Содержимое B',
		])
	})
})

describe('aria-expanded', () => {
	it('отражает раскрытость и стоит на заголовке, а не на обёртке', () => {
		mountHost(Harness)

		expect(header('Первый').getAttribute('aria-expanded')).toBe('true')
		expect(header('Второй').getAttribute('aria-expanded')).toBe('false')
		expect(sections()[0].hasAttribute('aria-selected')).toBe(false)
		expect(sections()[0].hasAttribute('aria-expanded')).toBe(false)
	})

	it('следует за раскрытием по клику', () => {
		const fixture = mountHost(Harness)

		click(fixture, header('Второй'))

		expect(header('Второй').getAttribute('aria-expanded')).toBe('true')
	})

	it('тема раскрывает панель по data-selected на корне секции', () => {
		mountHost(Harness)

		expect(sections().map((section) => section.getAttribute('data-selected'))).toEqual([
			'true',
			'false',
		])
	})
})

/**
 * `mode` у Accordion — регрессионный тест, как у Vue: до выноса фасадов на
 * общую базу `mode="multiple"` молча не работал, и вторая раскрытая секция
 * закрывала первую.
 */
describe('Accordion mode', () => {
	const open = () =>
		sections().filter((section) => section.getAttribute('data-selected') === 'true')

	it('multiple держит две секции раскрытыми одновременно', () => {
		const fixture = mountHost(Harness)

		click(fixture, header('Второй'))

		expect(open()).toHaveLength(2)
	})

	it('single раскрывает одну: вторая закрывает первую', () => {
		const fixture = mountHost(Harness)

		fixture.componentInstance.mode.set('single')
		fixture.detectChanges()
		click(fixture, header('Второй'))

		expect(open()).toHaveLength(1)
		expect(header('Второй').getAttribute('aria-expanded')).toBe('true')
	})

	it('повторный клик сворачивает секцию, changeSelection сообщает', () => {
		const fixture = mountHost(Harness)

		click(fixture, header('Первый'))

		expect(open()).toHaveLength(0)
		expect(fixture.componentInstance.selections).toBeGreaterThan(0)
	})
})

describe('секция из разметки', () => {
	it('клик потребителя по секции не отменяет раскрытие', () => {
		@Component({
			standalone: true,
			imports: [TAccordionComponent, TAccordionItemComponent],
			template: `<div so-accordion>
				<div so-accordion-item text="A" value="a" (click)="clicks = clicks + 1"></div>
			</div>`,
		})
		class ClickHost {
			clicks = 0
		}

		const fixture = mountHost(ClickHost)

		click(fixture, header('A'))

		expect(fixture.componentInstance.clicks).toBe(1)
		expect(header('A').getAttribute('aria-expanded')).toBe('true')
	})

	it('класс и стиль потребителя — корню секции, остальное — заголовку', () => {
		@Component({
			standalone: true,
			imports: [TAccordionComponent, TAccordionItemComponent],
			template: `<div so-accordion>
				<div
					so-accordion-item
					text="A"
					value="a"
					class="mine"
					style="color: red"
					title="Раздел"
				></div>
			</div>`,
		})
		class SplitHost {}

		mountHost(SplitHost)

		const section = find(document, '.so-accordion-item', HTMLElement)

		expect(section.classList.contains('mine')).toBe(true)
		expect(section.style.color).toBe('red')
		expect(header('A').getAttribute('title')).toBe('Раздел')
		expect(header('A').classList.contains('mine')).toBe(false)
	})

	it('header — шаблоном с text и selected или проекцией, без него — text', () => {
		@Component({
			standalone: true,
			imports: [TAccordionComponent, TAccordionItemComponent, SlotDirective],
			template: `<div so-accordion>
				<div so-accordion-item text="A" value="a">
					<ng-template slot="header" let-text="text" let-selected="selected"
						>{{ text }}:{{ selected }}</ng-template
					>
				</div>
				<div so-accordion-item text="B" value="b"></div>
				<div so-accordion-item text="C" value="c"><b slot="header">Свой</b></div>
			</div>`,
		})
		class HeaderHost {}

		const fixture = mountHost(HeaderHost)

		expect(headers().map((node) => node.textContent?.trim())).toEqual(['A:false', 'B', 'Свой'])
		// Шаблон заголовка — не содержимое панели
		expect(contents().map((content) => content.textContent?.trim())).toEqual(['', '', ''])

		click(fixture, header('A:false'))

		expect(headers().map((node) => node.textContent?.trim())).toEqual(['A:true', 'B', 'Свой'])
	})

	/**
	 * Стрелка — по краю заголовка со стороны `arrowPlacement`; слоты
	 * `leading-icon` и `trailing-icon` её подменяют. Подменённая стоит в той же
	 * обёртке `.so-accordion-item__arrow`: по ней тема поворачивает стрелку
	 * раскрытой секции, и подменённая поворачивается так же.
	 */
	it('стрелка стоит со стороны arrowPlacement, шаблон её подменяет', () => {
		@Component({
			standalone: true,
			imports: [TAccordionComponent, TAccordionItemComponent, SlotDirective],
			template: `<div so-accordion>
				@switch (variant()) {
					@case ('trailing-icon') {
						<div so-accordion-item text="A" value="a" arrowPlacement="end">
							<ng-template slot="trailing-icon"><b class="custom">›</b></ng-template>
						</div>
					}
					@case ('leading-icon') {
						<div so-accordion-item text="A" value="a" arrowPlacement="end">
							<ng-template slot="leading-icon"><b class="custom">•</b></ng-template>
						</div>
					}
					@default {
						<div
							so-accordion-item
							text="A"
							value="a"
							[arrowPlacement]="placement()"
						></div>
					}
				}
			</div>`,
		})
		class ArrowHost {
			readonly placement = signal<TAccordionArrowPlacement>('start')
			readonly variant = signal<'plain' | 'trailing-icon' | 'leading-icon'>('plain')
		}

		const fixture = mountHost(ArrowHost)
		const arrowSide = () => {
			const arrow = find(document, '.so-accordion-item__arrow', Element)
			const text = find(document, '.so-accordion-item__header .so-button__text', HTMLElement)

			return arrow.compareDocumentPosition(text) & Node.DOCUMENT_POSITION_FOLLOWING
				? 'start'
				: 'end'
		}

		expect(arrowSide()).toBe('start')

		fixture.componentInstance.placement.set('end')
		fixture.detectChanges()

		expect(arrowSide()).toBe('end')

		fixture.componentInstance.variant.set('trailing-icon')
		fixture.detectChanges()

		expect(arrowSide()).toBe('end')
		expect(document.querySelectorAll('.so-accordion-item__arrow')).toHaveLength(1)
		expect(document.querySelector('.so-accordion-item__arrow .custom')).not.toBeNull()
		expect(document.querySelector('.so-accordion-item__arrow svg')).toBeNull()

		// Слот на стороне без стрелки по умолчанию — своя обёртка, стрелка остаётся
		fixture.componentInstance.variant.set('leading-icon')
		fixture.detectChanges()

		expect(
			[...document.querySelectorAll('.so-accordion-item__arrow')].map((arrow) =>
				arrow.querySelector('.custom')
					? 'slot'
					: arrow.querySelector('svg')
						? 'icon'
						: 'empty',
			),
		).toEqual(['slot', 'icon'])
	})

	it('слоты секций из items получают элемент через scope', () => {
		@Component({
			standalone: true,
			imports: [TAccordionComponent, SlotDirective],
			template: `<div so-accordion [items]="items">
				<ng-template slot="item" let-item="item">[{{ item.text }}]</ng-template>
				<ng-template slot="item-leading" let-item="item"
					><u class="lead">{{ item.value }}</u></ng-template
				>
				<ng-template slot="item-trailing" let-item="item"
					><s class="trail">{{ item.value }}</s></ng-template
				>
				<ng-template slot="item-content" let-item="item"
					><p class="body">{{ item.value }}</p></ng-template
				>
			</div>`,
		})
		class RelayHost {
			readonly items = [
				{ value: 'a', text: 'Первый' },
				{ value: 'b', text: 'Второй' },
			]
		}

		mountHost(RelayHost)

		expect(
			headers().map((node) => node.querySelector('.so-button__text')?.textContent),
		).toEqual(['[Первый]', '[Второй]'])
		expect([...document.querySelectorAll('.lead')].map((node) => node.textContent)).toEqual([
			'a',
			'b',
		])
		expect([...document.querySelectorAll('.trail')].map((node) => node.textContent)).toEqual([
			'a',
			'b',
		])
		expect(contents().map((content) => content.textContent)).toEqual(['a', 'b'])
	})
})

/**
 * Проброс слотов секции аккордеоном: у каждого слота секции есть
 * `item-<слот>`, scope — scope слота секции плюс сама секция. Состав сверяет
 * `setup/__tests__/item-slots.spec.ts`.
 */
describe('проброс слотов секций из items', () => {
	const ITEMS = [
		{ value: 'a', text: 'Первый' },
		{ value: 'b', text: 'Второй' },
	]

	/** Стрелки секций по порядку: что лежит в каждой обёртке. */
	const arrows = () =>
		sections().map((section) =>
			[...section.querySelectorAll('.so-accordion-item__arrow')].map((arrow) =>
				arrow.querySelector('.probe')
					? 'slot'
					: arrow.querySelector('svg')
						? 'icon'
						: 'empty',
			),
		)

	it('item получает text и selected секции, selected следует за раскрытием', () => {
		@Component({
			standalone: true,
			imports: [TAccordionComponent, SlotDirective],
			template: `<div so-accordion [items]="items">
				<ng-template slot="item" let-item="item" let-text="text" let-selected="selected"
					>{{ item.value }}:{{ text }}:{{ selected }}</ng-template
				>
			</div>`,
		})
		class ScopeHost {
			readonly items = ITEMS
		}

		const fixture = mountHost(ScopeHost)

		expect(headers().map((node) => node.textContent?.trim())).toEqual([
			'a:Первый:false',
			'b:Второй:false',
		])

		click(fixture, header('b:Второй:false'))

		expect(headers().map((node) => node.textContent?.trim())).toEqual([
			'a:Первый:false',
			'b:Второй:true',
		])
	})

	/**
	 * Шаблон непрозрачен: что он нарисовал, секция не видит, — и шаблон,
	 * заданный аккордеону, рисуется у каждой секции вместо стрелки по
	 * умолчанию, как сниппет у Svelte.
	 */
	it('item-leading-icon задан — у каждой секции вместо стрелки по умолчанию', () => {
		@Component({
			standalone: true,
			imports: [TAccordionComponent, SlotDirective],
			template: `<div so-accordion [items]="items">
				<ng-template slot="item-leading-icon" let-item="item">
					@if (item.value === 'a') {
						<b class="probe">›</b>
					}
				</ng-template>
			</div>`,
		})
		class LeadingHost {
			readonly items = ITEMS
		}

		mountHost(LeadingHost)

		expect(arrows()).toEqual([['slot'], ['empty']])
	})

	/**
	 * Стрелка по умолчанию — в начале, поэтому у секции, которой шаблон в конце
	 * ничего не нарисовал, обёртка в конце пуста: слот задан. Пустую обёртку
	 * прячет тема по `:empty`, поэтому в ней нет ни элемента, ни текста.
	 */
	it('item-trailing-icon: у секции без подмены обёртка в конце пуста', () => {
		@Component({
			standalone: true,
			imports: [TAccordionComponent, SlotDirective],
			template: `<div so-accordion [items]="items">
				<ng-template slot="item-trailing-icon" let-item="item">
					@if (item.value === 'b') {
						<b class="probe">›</b>
					}
				</ng-template>
			</div>`,
		})
		class TrailingHost {
			readonly items = ITEMS
		}

		mountHost(TrailingHost)

		expect(arrows()).toEqual([
			['icon', 'empty'],
			['icon', 'slot'],
		])

		const empty = [...document.querySelectorAll('.so-accordion-item__arrow')].filter(
			(arrow) => !arrow.querySelector('.probe, svg'),
		)

		expect(empty.map((arrow) => [arrow.children.length, arrow.textContent?.trim()])).toEqual([
			[0, ''],
		])
	})
})

describe('типы', () => {
	it('выходы фасадов — выходы компонентов', () => {
		expectTypeOf<TAccordionComponent['soChangeMode']>().toEqualTypeOf<
			EventEmitter<TSelectionMode>
		>()
		expectTypeOf<TAccordionComponent>().toHaveProperty('soChangeSelection')
		expectTypeOf<TAccordionComponent>().toHaveProperty('soEngineCreate')
		expectTypeOf<TAccordionItemComponent['soChangeSelected']>().toEqualTypeOf<
			EventEmitter<undefined>
		>()
		expectTypeOf<TAccordionItemComponent['soChangeOrder']>().toEqualTypeOf<
			EventEmitter<undefined>
		>()
	})

	it('вход selected секции — булев', () => {
		expectTypeOf<TAccordionItemComponent['selected']>().toEqualTypeOf<boolean | undefined>()
	})
})
