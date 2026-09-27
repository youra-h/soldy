/**
 * Accordion в React — раскрывающиеся секции на движке коллекций.
 *
 * Сценарии — те же, что у Vue (`accordion`, `accordion-mode`): связка
 * «заголовок ↔ панель», `aria-expanded` на заголовке, режим нескольких
 * раскрытых секций. Клавиатуры у аккордеона своей нет: заголовок — нативная
 * кнопка. Пересборку, сервер и гидратацию проверяет
 * `tabs-accordion-elevator.spec.tsx`.
 */

import { describe, it, expect, expectTypeOf, vi } from 'vitest'
import { act, type ReactNode } from 'react'
import type { IAccordionItem } from '@soldy-ui/core'
import {
	Accordion,
	AccordionItem,
	type AccordionItemProps,
	type AccordionProps,
} from '@soldy-ui/react'
import { find, mount } from './mount'

const headers = () => [...document.querySelectorAll('.s-accordion-item__header')]

const contents = () => [...document.querySelectorAll('.s-accordion-item__content')]

const sections = () => [...document.querySelectorAll('.s-accordion-item')]

/** Заголовок секции по тексту; нет его — тест падает здесь. */
function header(text: string): HTMLElement {
	const found = headers().find((candidate) => candidate.textContent?.trim() === text)

	if (!(found instanceof HTMLElement)) throw new Error(`секции «${text}» нет`)

	return found
}

function click(element: HTMLElement): void {
	act(() => element.click())
}

/** Секции из разметки — как `Accordion.test.vue` у Vue. */
function Harness(props: AccordionProps): ReactNode {
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
		mount(<Harness />)

		const [first] = headers()
		const [content] = contents()

		expect(first.getAttribute('aria-controls')).toBe(content.id)
		expect(content.getAttribute('aria-labelledby')).toBe(first.id)
	})

	it('панель объявлена как region', () => {
		mount(<Harness />)

		expect(contents()[0].getAttribute('role')).toBe('region')
	})

	it('id уникальны между элементами', () => {
		mount(<Harness />)

		const [first, second] = contents()

		expect(first.id).not.toBe(second.id)
	})

	it('содержимое секции — в её панели', () => {
		mount(<Harness />)

		expect(contents().map((content) => content.textContent)).toEqual([
			'Содержимое A',
			'Содержимое B',
		])
	})
})

describe('aria-expanded', () => {
	it('отражает раскрытость и стоит на заголовке, а не на обёртке', () => {
		mount(<Harness />)

		expect(header('Первый').getAttribute('aria-expanded')).toBe('true')
		expect(header('Второй').getAttribute('aria-expanded')).toBe('false')
		expect(sections()[0].hasAttribute('aria-selected')).toBe(false)
		expect(sections()[0].hasAttribute('aria-expanded')).toBe(false)
	})

	it('следует за раскрытием по клику', () => {
		mount(<Harness />)

		click(header('Второй'))

		expect(header('Второй').getAttribute('aria-expanded')).toBe('true')
	})

	it('тема раскрывает панель по data-selected на корне секции', () => {
		mount(<Harness />)

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
		mount(<Harness />)

		click(header('Второй'))

		expect(open()).toHaveLength(2)
	})

	it('single раскрывает одну: вторая закрывает первую', () => {
		mount(<Harness mode="single" />)

		click(header('Второй'))

		expect(open()).toHaveLength(1)
		expect(header('Второй').getAttribute('aria-expanded')).toBe('true')
	})

	it('повторный клик сворачивает секцию, onChangeSelection сообщает', () => {
		const onChangeSelection = vi.fn()

		mount(<Harness onChangeSelection={onChangeSelection} />)

		click(header('Первый'))

		expect(open()).toHaveLength(0)
		expect(onChangeSelection).toHaveBeenCalled()
	})
})

describe('секция из разметки', () => {
	it('клик потребителя по заголовку не отменяет раскрытие', () => {
		const onClick = vi.fn()

		mount(
			<Accordion>
				<Accordion.Item text="A" value="a" onClick={onClick} />
			</Accordion>,
		)

		click(header('A'))

		expect(onClick).toHaveBeenCalledTimes(1)
		expect(header('A').getAttribute('aria-expanded')).toBe('true')
	})

	it('класс и стиль потребителя — корню секции, остальное — заголовку', () => {
		mount(
			<Accordion>
				<Accordion.Item
					text="A"
					value="a"
					className="mine"
					style={{ color: 'red' }}
					title="Раздел"
				/>
			</Accordion>,
		)

		const section = find(document, '.s-accordion-item', HTMLElement)

		expect(section.classList.contains('mine')).toBe(true)
		expect(section.style.color).toBe('red')
		expect(header('A').getAttribute('title')).toBe('Раздел')
		expect(header('A').classList.contains('mine')).toBe(false)
	})

	it('header получает text и selected, без него — text', () => {
		mount(
			<Accordion>
				<Accordion.Item
					text="A"
					value="a"
					header={({ text, selected }) => `${text}:${String(selected)}`}
				/>
				<Accordion.Item text="B" value="b" />
			</Accordion>,
		)

		expect(headers().map((node) => node.textContent?.trim())).toEqual(['A:false', 'B'])

		click(header('A:false'))

		expect(headers().map((node) => node.textContent?.trim())).toEqual(['A:true', 'B'])
	})

	/**
	 * Стрелка — по краю заголовка со стороны `arrowPlacement`; слоты
	 * `leading-icon` и `trailing-icon` её подменяют.
	 */
	it('стрелка стоит со стороны arrowPlacement, слот её подменяет', () => {
		const { render } = mount(
			<Accordion>
				<Accordion.Item text="A" value="a" />
			</Accordion>,
		)
		const arrowSide = () => {
			const arrow = find(document, '.s-accordion-item__arrow', Element)
			const text = find(document, '.s-accordion-item__header .s-button__text', HTMLElement)

			return arrow.compareDocumentPosition(text) & Node.DOCUMENT_POSITION_FOLLOWING
				? 'start'
				: 'end'
		}

		expect(arrowSide()).toBe('start')

		render(
			<Accordion>
				<Accordion.Item text="A" value="a" arrowPlacement="end" />
			</Accordion>,
		)

		expect(arrowSide()).toBe('end')

		render(
			<Accordion>
				<Accordion.Item
					text="A"
					value="a"
					arrowPlacement="end"
					trailing-icon={<b className="custom">›</b>}
				/>
			</Accordion>,
		)

		expect(document.querySelector('.s-accordion-item__arrow')).toBeNull()
		expect(document.querySelector('.s-accordion-item__header .custom')).not.toBeNull()
	})

	it('слоты секций из items получают элемент через scope', () => {
		mount(
			<Accordion
				items={[
					{ value: 'a', text: 'Первый' },
					{ value: 'b', text: 'Второй' },
				]}
				item={({ item }) => `[${item.text}]`}
				item-leading={({ item }) => <u className="lead">{String(item.value)}</u>}
				item-trailing={({ item }) => <s className="trail">{String(item.value)}</s>}
				item-content={({ item }) => <p className="body">{String(item.value)}</p>}
			/>,
		)

		expect(headers().map((node) => node.querySelector('.s-button__text')?.textContent)).toEqual(
			['[Первый]', '[Второй]'],
		)
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

describe('типы', () => {
	it('слоты несут scope из дескрипторов', () => {
		type TItemSlot = NonNullable<AccordionProps['item']>
		type TItemContent = NonNullable<AccordionProps['item-content']>
		type THeader = NonNullable<AccordionItemProps['header']>

		expectTypeOf<(scope: { item: IAccordionItem }) => ReactNode>().toExtend<TItemSlot>()
		expectTypeOf<(scope: { item: IAccordionItem }) => ReactNode>().toExtend<TItemContent>()
		expectTypeOf<
			(scope: { text: string; selected: boolean }) => ReactNode
		>().toExtend<THeader>()
		expectTypeOf<AccordionItemProps['children']>().toEqualTypeOf<ReactNode>()
	})

	it('колбэки фасадов — пропсы компонентов', () => {
		expectTypeOf<AccordionProps>().toHaveProperty('onChangeMode')
		expectTypeOf<AccordionProps>().toHaveProperty('onChangeSelection')
		expectTypeOf<AccordionProps>().toHaveProperty('onEngineCreate')
		expectTypeOf<AccordionItemProps>().toHaveProperty('onChangeSelected')
		expectTypeOf<AccordionItemProps>().toHaveProperty('onChangeOrder')
	})
})
