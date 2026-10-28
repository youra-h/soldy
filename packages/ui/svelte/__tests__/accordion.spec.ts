/**
 * Accordion в Svelte — раскрывающиеся секции на движке коллекций.
 *
 * Сценарии — те же, что у React (`accordion.spec.tsx`) и Vue (`accordion`,
 * `accordion-mode`): связка «заголовок ↔ панель», `aria-expanded` на
 * заголовке, режим нескольких раскрытых секций. Клавиатуры у аккордеона своей
 * нет: заголовок — нативная кнопка. Сервер проверяет
 * `collections.server.spec.ts`.
 */

import { describe, it, expect, expectTypeOf, vi } from 'vitest'
import { flushSync, type ComponentProps, type Snippet } from 'svelte'
import type { IAccordionItem } from '@soldy-ui/core'
import {
	Accordion,
	AccordionItem,
	type AccordionItemProps,
	type AccordionProps,
} from '@soldy-ui/svelte'
import Harness from './Accordion.test.svelte'
import Slots from './AccordionSlots.test.svelte'
import { find, mount } from './mount'
import { reactiveProps } from './reactive-props.svelte'
import { markup, scopeMarkup, scopeText } from './snippets.svelte'

const headers = () => [...document.querySelectorAll('.so-accordion-item__header')]

const contents = () => [...document.querySelectorAll('.so-accordion-item__content')]

const sections = () => [...document.querySelectorAll('.so-accordion-item')]

/** Заголовок секции по тексту; нет его — тест падает здесь. */
function header(text: string): HTMLElement {
	const found = headers().find((candidate) => candidate.textContent?.trim() === text)

	if (!(found instanceof HTMLElement)) throw new Error(`секции «${text}» нет`)

	return found
}

function click(element: HTMLElement): void {
	element.click()
	flushSync()
}

type THarnessProps = ComponentProps<typeof Harness>

/** Scope слотов секции: заголовка, проброса заголовка и проброса без своего scope. */
type THeaderScope = { text: string; selected: boolean }
type TItemHeaderScope = THeaderScope & { item: IAccordionItem }
type TItemScope = { item: IAccordionItem }

/** Секции из разметки — как `Accordion.test.vue` у Vue. */
function harness(props: AccordionProps = {}): THarnessProps {
	return {
		accordion: { mode: 'multiple', ...props },
		items: [
			{ text: 'Первый', value: 'a', selected: true },
			{ text: 'Второй', value: 'b' },
		],
		bodies: { a: 'Содержимое A', b: 'Содержимое B' },
	}
}

describe('составной компонент', () => {
	it('Accordion.Item === AccordionItem', () => {
		expect(Accordion.Item).toBe(AccordionItem)
		expectTypeOf(Accordion.Item).toEqualTypeOf<typeof AccordionItem>()
	})

	it('части у Accordion только одна: панель — слот, а не компонент', () => {
		// У Tabs есть Content, у Accordion его нет намеренно
		expect('Content' in Accordion).toBe(false)
	})
})

describe('связка ARIA заголовок ↔ панель', () => {
	it('aria-controls заголовка указывает на id панели, aria-labelledby — обратно', () => {
		mount(Harness, harness())

		const [first] = headers()
		const [content] = contents()

		expect(first.getAttribute('aria-controls')).toBe(content.id)
		expect(content.getAttribute('aria-labelledby')).toBe(first.id)
	})

	it('панель объявлена как region', () => {
		mount(Harness, harness())

		expect(contents()[0].getAttribute('role')).toBe('region')
	})

	it('id уникальны между элементами', () => {
		mount(Harness, harness())

		const [first, second] = contents()

		expect(first.id).not.toBe(second.id)
	})

	it('содержимое секции — в её панели', () => {
		mount(Harness, harness())

		expect(contents().map((content) => content.textContent)).toEqual([
			'Содержимое A',
			'Содержимое B',
		])
	})
})

describe('aria-expanded', () => {
	it('отражает раскрытость и стоит на заголовке, а не на обёртке', () => {
		mount(Harness, harness())

		expect(header('Первый').getAttribute('aria-expanded')).toBe('true')
		expect(header('Второй').getAttribute('aria-expanded')).toBe('false')
		expect(sections()[0].hasAttribute('aria-selected')).toBe(false)
		expect(sections()[0].hasAttribute('aria-expanded')).toBe(false)
	})

	it('следует за раскрытием по клику', () => {
		mount(Harness, harness())

		click(header('Второй'))

		expect(header('Второй').getAttribute('aria-expanded')).toBe('true')
	})

	it('тема раскрывает панель по data-selected на корне секции', () => {
		mount(Harness, harness())

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
		mount(Harness, harness())

		click(header('Второй'))

		expect(open()).toHaveLength(2)
	})

	it('single раскрывает одну: вторая закрывает первую', () => {
		mount(Harness, harness({ mode: 'single' }))

		click(header('Второй'))

		expect(open()).toHaveLength(1)
		expect(header('Второй').getAttribute('aria-expanded')).toBe('true')
	})

	it('повторный клик сворачивает секцию, onChangeSelection сообщает', () => {
		const onChangeSelection = vi.fn()

		mount(Harness, harness({ onChangeSelection }))

		click(header('Первый'))

		expect(open()).toHaveLength(0)
		expect(onChangeSelection).toHaveBeenCalled()
	})
})

describe('секция из разметки', () => {
	it('клик потребителя по заголовку не отменяет раскрытие', () => {
		const onclick = vi.fn()

		mount(Harness, { items: [{ text: 'A', value: 'a', onclick }] })

		click(header('A'))

		expect(onclick).toHaveBeenCalledTimes(1)
		expect(header('A').getAttribute('aria-expanded')).toBe('true')
	})

	it('класс и стиль потребителя — корню секции, остальное — заголовку', () => {
		mount(Harness, {
			items: [{ text: 'A', value: 'a', class: 'mine', style: 'color: red', title: 'Раздел' }],
		})

		const section = find(document, '.so-accordion-item', HTMLElement)

		expect(section.classList.contains('mine')).toBe(true)
		expect(section.style.color).toBe('red')
		expect(header('A').getAttribute('title')).toBe('Раздел')
		expect(header('A').classList.contains('mine')).toBe(false)
	})

	it('header получает text и selected, без него — text', () => {
		mount(Harness, {
			items: [
				{
					text: 'A',
					value: 'a',
					header: scopeText<THeaderScope>(
						({ text, selected }) => `${text}:${String(selected)}`,
					),
				},
				{ text: 'B', value: 'b' },
			],
		})

		expect(headers().map((node) => node.textContent?.trim())).toEqual(['A:false', 'B'])

		click(header('A:false'))

		expect(headers().map((node) => node.textContent?.trim())).toEqual(['A:true', 'B'])
	})

	/**
	 * Стрелка — по краю заголовка со стороны `arrowPlacement`; слоты
	 * `leading-icon` и `trailing-icon` её подменяют. Подменённая стоит в той же
	 * обёртке `.so-accordion-item__arrow`: по ней тема поворачивает стрелку
	 * раскрытой секции, и подменённая поворачивается так же.
	 */
	it('стрелка стоит со стороны arrowPlacement, слот её подменяет', () => {
		const props = reactiveProps<THarnessProps>({ items: [{ text: 'A', value: 'a' }] })
		const arrowSide = () => {
			const arrow = find(document, '.so-accordion-item__arrow', Element)
			const text = find(document, '.so-accordion-item__header .so-button__text', HTMLElement)

			return arrow.compareDocumentPosition(text) & Node.DOCUMENT_POSITION_FOLLOWING
				? 'start'
				: 'end'
		}

		mount(Harness, props)

		expect(arrowSide()).toBe('start')

		props.items = [{ text: 'A', value: 'a', arrowPlacement: 'end' }]
		flushSync()

		expect(arrowSide()).toBe('end')

		props.items = [
			{
				text: 'A',
				value: 'a',
				arrowPlacement: 'end',
				'trailing-icon': markup('<b class="custom">›</b>'),
			},
		]
		flushSync()

		expect(arrowSide()).toBe('end')
		expect(document.querySelectorAll('.so-accordion-item__arrow')).toHaveLength(1)
		expect(document.querySelector('.so-accordion-item__arrow .custom')).not.toBeNull()
		expect(document.querySelector('.so-accordion-item__arrow svg')).toBeNull()

		// Слот на стороне без стрелки по умолчанию — своя обёртка, стрелка остаётся
		props.items = [
			{
				text: 'A',
				value: 'a',
				arrowPlacement: 'end',
				'leading-icon': markup('<b class="custom">•</b>'),
			},
		]
		flushSync()

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
		mount(Accordion, {
			items: [
				{ value: 'a', text: 'Первый' },
				{ value: 'b', text: 'Второй' },
			],
			item: scopeText<TItemHeaderScope>(({ item }) => `[${item.text}]`),
			'item-leading': scopeMarkup<TItemScope>(
				({ item }) => `<u class="lead">${String(item.value)}</u>`,
			),
			'item-trailing': scopeMarkup<TItemScope>(
				({ item }) => `<s class="trail">${String(item.value)}</s>`,
			),
			'item-content': scopeMarkup<TItemScope>(
				({ item }) => `<p class="body">${String(item.value)}</p>`,
			),
		})

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
 *
 * Сниппет непрозрачен: что он нарисовал у секции, та не видит, и заданная
 * аккордеону стрелка стоит у каждой секции, даже где сниппет пуст, — как у
 * Vue: по наличию слота секция решает, стоять ли обёртке.
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
		mount(Accordion, {
			items: ITEMS,
			item: scopeText<TItemHeaderScope>(
				({ item, text, selected }) => `${String(item.value)}:${text}:${String(selected)}`,
			),
		})

		expect(headers().map((node) => node.textContent?.trim())).toEqual([
			'a:Первый:false',
			'b:Второй:false',
		])

		click(header('b:Второй:false'))

		expect(headers().map((node) => node.textContent?.trim())).toEqual([
			'a:Первый:false',
			'b:Второй:true',
		])
	})

	it('item-leading-icon задан — у каждой секции вместо стрелки по умолчанию', () => {
		mount(Slots, { case: 'leading-icon' })

		expect(arrows()).toEqual([['slot'], ['empty']])
	})

	/**
	 * Стрелка по умолчанию — в начале, поэтому у секции, которой слот в конце
	 * ничего не нарисовал, обёртка в конце пуста: слот задан. Пустую обёртку
	 * прячет тема по `:empty`, поэтому в ней нет ни узла, ни текста.
	 */
	it('item-trailing-icon: у секции без подмены обёртка в конце пуста', () => {
		mount(Slots, { case: 'trailing-icon' })

		expect(arrows()).toEqual([
			['icon', 'empty'],
			['icon', 'slot'],
		])

		const empty = [...document.querySelectorAll('.so-accordion-item__arrow')].filter(
			(arrow) => !arrow.querySelector('.probe, svg'),
		)

		expect(empty.map((arrow) => [arrow.children.length, arrow.textContent])).toEqual([[0, '']])
	})
})

describe('типы', () => {
	/** Тип проверяет не vitest, а шаг CI «Типы — Svelte». */
	it('слоты несут scope из дескрипторов', () => {
		expectTypeOf<Snippet<[TItemHeaderScope]>>().toExtend<NonNullable<AccordionProps['item']>>()
		expectTypeOf<Snippet<[TItemScope]>>().toExtend<
			NonNullable<AccordionProps['item-content']>
		>()
		expectTypeOf<Snippet<[TItemScope]>>().toExtend<
			NonNullable<AccordionProps['item-leading-icon']>
		>()
		expectTypeOf<Snippet<[TItemScope]>>().toExtend<
			NonNullable<AccordionProps['item-trailing-icon']>
		>()
		// The section carries itself (`ctrl`) into its own slots' scope
		expectTypeOf<Snippet<[TItemHeaderScope]>>().toExtend<
			NonNullable<AccordionItemProps['header']>
		>()
		expectTypeOf<Snippet<[TItemScope]>>().toExtend<
			NonNullable<AccordionItemProps['children']>
		>()
	})

	it('колбэки фасадов — пропсы компонентов', () => {
		expectTypeOf<AccordionProps>().toHaveProperty('onChangeMode')
		expectTypeOf<AccordionProps>().toHaveProperty('onChangeSelection')
		expectTypeOf<AccordionProps>().toHaveProperty('onEngineCreate')
		expectTypeOf<AccordionItemProps>().toHaveProperty('onChangeSelected')
		expectTypeOf<AccordionItemProps>().toHaveProperty('onChangeOrder')
	})
})
