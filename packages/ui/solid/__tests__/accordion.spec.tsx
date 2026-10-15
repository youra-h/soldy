/**
 * Accordion в Solid — раскрывающиеся секции на движке коллекций.
 *
 * Сценарии — те же, что у React (`accordion.spec.tsx`) и Svelte
 * (`accordion.spec.ts`): связка «заголовок ↔ панель», `aria-expanded` на
 * заголовке, режим нескольких раскрытых секций. Клавиатуры у аккордеона своей
 * нет: заголовок — нативная кнопка. Сервер проверяет
 * `collections.server.spec.tsx`.
 */

import { describe, it, expect, expectTypeOf, vi } from 'vitest'
import { createSignal, type JSX } from 'solid-js'
import type { IAccordionItem, TAccordionArrowPlacement } from '@soldy-ui/core'
import {
	Accordion,
	AccordionItem,
	type AccordionItemProps,
	type AccordionProps,
} from '@soldy-ui/solid'
import { find, mount } from './mount'

const headers = () => [...document.querySelectorAll('.so-accordion-item__header')]

const contents = () => [...document.querySelectorAll('.so-accordion-item__content')]

const sections = () => [...document.querySelectorAll('.so-accordion-item')]

/** Заголовок секции по тексту; нет его — тест падает здесь. */
function header(text: string): HTMLElement {
	const found = headers().find((candidate) => candidate.textContent?.trim() === text)

	if (!(found instanceof HTMLElement)) throw new Error(`секции «${text}» нет`)

	return found
}

/** Секции из разметки — как `Accordion.test.vue` у Vue. */
function Harness(props: AccordionProps): JSX.Element {
	return (
		<Accordion mode="multiple" {...props}>
			<Accordion.Item text="Первый" value="a" selected>
				<p>Содержимое A</p>
			</Accordion.Item>
			<Accordion.Item text="Второй" value="b">
				<p>Содержимое B</p>
			</Accordion.Item>
		</Accordion>
	)
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
		mount(() => <Harness />)

		const [first] = headers()
		const [content] = contents()

		expect(first.getAttribute('aria-controls')).toBe(content.id)
		expect(content.getAttribute('aria-labelledby')).toBe(first.id)
	})

	it('панель объявлена как region', () => {
		mount(() => <Harness />)

		expect(contents()[0].getAttribute('role')).toBe('region')
	})

	it('id уникальны между элементами', () => {
		mount(() => <Harness />)

		const [first, second] = contents()

		expect(first.id).not.toBe(second.id)
	})

	it('содержимое секции — в её панели', () => {
		mount(() => <Harness />)

		expect(contents().map((content) => content.textContent)).toEqual([
			'Содержимое A',
			'Содержимое B',
		])
	})
})

describe('aria-expanded', () => {
	it('отражает раскрытость и стоит на заголовке, а не на обёртке', () => {
		mount(() => <Harness />)

		expect(header('Первый').getAttribute('aria-expanded')).toBe('true')
		expect(header('Второй').getAttribute('aria-expanded')).toBe('false')
		expect(sections()[0].hasAttribute('aria-selected')).toBe(false)
		expect(sections()[0].hasAttribute('aria-expanded')).toBe(false)
	})

	it('следует за раскрытием по клику', () => {
		mount(() => <Harness />)

		header('Второй').click()

		expect(header('Второй').getAttribute('aria-expanded')).toBe('true')
	})

	it('тема раскрывает панель по data-selected на корне секции', () => {
		mount(() => <Harness />)

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
		mount(() => <Harness />)

		header('Второй').click()

		expect(open()).toHaveLength(2)
	})

	it('single раскрывает одну: вторая закрывает первую', () => {
		mount(() => <Harness mode="single" />)

		header('Второй').click()

		expect(open()).toHaveLength(1)
		expect(header('Второй').getAttribute('aria-expanded')).toBe('true')
	})

	it('повторный клик сворачивает секцию, onChangeSelection сообщает', () => {
		const onChangeSelection = vi.fn()

		mount(() => <Harness onChangeSelection={onChangeSelection} />)

		header('Первый').click()

		expect(open()).toHaveLength(0)
		expect(onChangeSelection).toHaveBeenCalled()
	})
})

describe('секция из разметки', () => {
	it('клик потребителя по заголовку не отменяет раскрытие', () => {
		const onClick = vi.fn()

		mount(() => (
			<Accordion>
				<Accordion.Item text="A" value="a" onClick={onClick} />
			</Accordion>
		))

		header('A').click()

		expect(onClick).toHaveBeenCalledTimes(1)
		expect(header('A').getAttribute('aria-expanded')).toBe('true')
	})

	it('класс и стиль потребителя — корню секции, остальное — заголовку', () => {
		mount(() => (
			<Accordion>
				<Accordion.Item
					text="A"
					value="a"
					class="mine"
					style={{ color: 'red' }}
					title="Раздел"
				/>
			</Accordion>
		))

		const section = find(document, '.so-accordion-item', HTMLElement)

		expect(section.classList.contains('mine')).toBe(true)
		expect(section.style.color).toBe('red')
		expect(header('A').getAttribute('title')).toBe('Раздел')
		expect(header('A').classList.contains('mine')).toBe(false)
	})

	it('header получает text и selected, без него — text', () => {
		mount(() => (
			<Accordion>
				<Accordion.Item
					text="A"
					value="a"
					header={({ text, selected }) => `${text}:${String(selected)}`}
				/>
				<Accordion.Item text="B" value="b" />
			</Accordion>
		))

		expect(headers().map((node) => node.textContent?.trim())).toEqual(['A:false', 'B'])

		header('A:false').click()

		expect(headers().map((node) => node.textContent?.trim())).toEqual(['A:true', 'B'])
	})

	/**
	 * Стрелка — по краю заголовка со стороны `arrowPlacement`; слоты
	 * `leading-icon` и `trailing-icon` её подменяют. Подменённая стоит в той же
	 * обёртке `.so-accordion-item__arrow`: по ней тема поворачивает стрелку
	 * раскрытой секции, и подменённая поворачивается так же.
	 */
	it('стрелка стоит со стороны arrowPlacement, слот её подменяет', () => {
		const [placement, setPlacement] = createSignal<TAccordionArrowPlacement>('start')
		const [slot, setSlot] = createSignal<'none' | 'leading' | 'trailing'>('none')
		const arrowSide = () => {
			const arrow = find(document, '.so-accordion-item__arrow', Element)
			const text = find(document, '.so-accordion-item__header .so-button__text', HTMLElement)

			return arrow.compareDocumentPosition(text) & Node.DOCUMENT_POSITION_FOLLOWING
				? 'start'
				: 'end'
		}

		mount(() => (
			<Accordion>
				<Accordion.Item
					text="A"
					value="a"
					arrowPlacement={placement()}
					leading-icon={slot() === 'leading' ? <b class="custom">•</b> : undefined}
					trailing-icon={slot() === 'trailing' ? <b class="custom">›</b> : undefined}
				/>
			</Accordion>
		))

		expect(arrowSide()).toBe('start')

		setPlacement('end')

		expect(arrowSide()).toBe('end')

		setSlot('trailing')

		expect(arrowSide()).toBe('end')
		expect(document.querySelectorAll('.so-accordion-item__arrow')).toHaveLength(1)
		expect(document.querySelector('.so-accordion-item__arrow .custom')).not.toBeNull()
		expect(document.querySelector('.so-accordion-item__arrow svg')).toBeNull()

		// Слот на стороне без стрелки по умолчанию — своя обёртка, стрелка остаётся
		setSlot('leading')

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
		mount(() => (
			<Accordion
				items={[
					{ value: 'a', text: 'Первый' },
					{ value: 'b', text: 'Второй' },
				]}
				item={({ item }) => `[${item.text}]`}
				item-leading={({ item }) => <u class="lead">{String(item.value)}</u>}
				item-trailing={({ item }) => <s class="trail">{String(item.value)}</s>}
				item-content={({ item }) => <p class="body">{String(item.value)}</p>}
			/>
		))

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
 * Пустое, что вернул проброс, секция видит, как у Vue и React: по наличию
 * слота она решает, стоять ли обёртке стрелки.
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
		mount(() => (
			<Accordion
				items={ITEMS}
				item={({ item, text, selected }) =>
					`${String(item.value)}:${text}:${String(selected)}`
				}
			/>
		))

		expect(headers().map((node) => node.textContent?.trim())).toEqual([
			'a:Первый:false',
			'b:Второй:false',
		])

		header('b:Второй:false').click()

		expect(headers().map((node) => node.textContent?.trim())).toEqual([
			'a:Первый:false',
			'b:Второй:true',
		])
	})

	/** Слоты стрелок аккордеону не заданы — проброса нет, у секций стрелка по умолчанию. */
	it('без слотов стрелок у каждой секции из данных — стрелка по умолчанию', () => {
		mount(() => <Accordion items={ITEMS} />)

		expect(arrows()).toEqual([['icon'], ['icon']])
	})

	it('item-leading-icon подменяет стрелку одной секции, в той же обёртке', () => {
		mount(() => (
			<Accordion
				items={ITEMS}
				item-leading-icon={({ item }) =>
					item.value === 'a' ? <b class="probe">›</b> : null
				}
			/>
		))

		expect(arrows()).toEqual([['slot'], ['icon']])
	})

	/**
	 * Стрелка по умолчанию — в начале, поэтому секции, которой слот в конце
	 * ничего не нарисовал, второй обёртки не достаётся: пустое содержимое
	 * слотом не считается.
	 */
	it('item-trailing-icon: у секции без подмены — только стрелка по умолчанию', () => {
		mount(() => (
			<Accordion
				items={ITEMS}
				item-trailing-icon={({ item }) =>
					item.value === 'b' ? <b class="probe">›</b> : null
				}
			/>
		))

		expect(arrows()).toEqual([['icon'], ['icon', 'slot']])
	})
})

describe('типы', () => {
	it('слоты несут scope из дескрипторов', () => {
		type TItemSlot = NonNullable<AccordionProps['item']>
		type TItemContent = NonNullable<AccordionProps['item-content']>
		type THeader = NonNullable<AccordionItemProps['header']>

		expectTypeOf<
			(scope: { item: IAccordionItem; text: string; selected: boolean }) => JSX.Element
		>().toExtend<TItemSlot>()
		expectTypeOf<(scope: { item: IAccordionItem }) => JSX.Element>().toExtend<TItemContent>()
		expectTypeOf<(scope: { item: IAccordionItem }) => JSX.Element>().toExtend<
			NonNullable<AccordionProps['item-leading-icon']>
		>()
		expectTypeOf<(scope: { item: IAccordionItem }) => JSX.Element>().toExtend<
			NonNullable<AccordionProps['item-trailing-icon']>
		>()
		expectTypeOf<
			(scope: { text: string; selected: boolean }) => JSX.Element
		>().toExtend<THeader>()
		expectTypeOf<AccordionItemProps['children']>().toEqualTypeOf<JSX.Element | undefined>()
	})

	it('колбэки фасадов — пропсы компонентов', () => {
		expectTypeOf<AccordionProps>().toHaveProperty('onChangeMode')
		expectTypeOf<AccordionProps>().toHaveProperty('onChangeSelection')
		expectTypeOf<AccordionProps>().toHaveProperty('onEngineCreate')
		expectTypeOf<AccordionItemProps>().toHaveProperty('onChangeSelected')
		expectTypeOf<AccordionItemProps>().toHaveProperty('onChangeOrder')
	})
})
