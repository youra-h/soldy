/**
 * Accordion под Web Components — раскрывающиеся секции на движке коллекций.
 *
 * Сценарии — те же, что у Angular (`accordion.spec.ts`), React и Vue, без
 * сервера: связка «заголовок ↔ панель», `aria-expanded` на заголовке, режим
 * нескольких раскрытых секций. Клавиатуры у аккордеона своей нет: заголовок —
 * нативная кнопка.
 *
 * Своё у Web Components — разметка. Секция — `<div is="so-accordion-item">`,
 * атрибуты потребителя у неё делятся между корнем и заголовком. Слоты секции —
 * свет заголовка (свет детали): `header` — его `default`, края — его
 * `leading` и `trailing`, а стрелка — обёртка на краю. Слоты секций из данных
 * — образцы, копию которых получает каждая секция.
 */

import { describe, it, expect, expectTypeOf, afterEach } from 'vitest'
import type { TSelectionMode } from '@soldy-ui/core'
import { AccordionDescriptor, AccordionItemDescriptor } from '@soldy-ui/setup'
import {
	TAccordionElement,
	TAccordionItemElement,
	type TAccordionElementProps,
	type TAccordionItemElementProps,
} from '@soldy-ui/webc'
import { accordionTemplate } from '../src/components/accordion/accordion.template'
import { accordionItemTemplate } from '../src/components/accordion/item/accordion-item.template'
import { bareContext } from './template-context'

/** Отрисовка коалесцируется в микротаске — ждём её перед проверкой. */
const flush = () => new Promise<void>((resolve) => queueMicrotask(() => resolve()))

afterEach(() => {
	document.body.innerHTML = ''
})

function isAccordion(node: Element | null): node is TAccordionElementProps {
	return node instanceof TAccordionElement
}

function isSection(node: Element | null): node is TAccordionItemElementProps {
	return node instanceof TAccordionItemElement
}

const headers = () => [...document.querySelectorAll('.so-accordion-item__header')]

const contents = () => [...document.querySelectorAll('.so-accordion-item__content')]

const sections = () => [...document.querySelectorAll('.so-accordion-item')]

/** Заголовок секции по тексту; нет его — тест падает здесь. */
function header(text: string): HTMLElement {
	const found = headers().find((candidate) => candidate.textContent?.trim() === text)

	if (!(found instanceof HTMLElement)) throw new Error(`секции «${text}» нет`)

	return found
}

/** Секция по тексту заголовка; нет её — тест падает здесь. */
function section(text: string): TAccordionItemElementProps {
	const found = header(text).closest('.so-accordion-item')

	if (!isSection(found)) throw new Error(`секции «${text}» нет`)

	return found
}

/** Узел по селектору; нет его или он не того вида — тест падает здесь. */
function find<T extends Element>(root: ParentNode, selector: string, type: new () => T): T {
	const node = root.querySelector(selector)

	if (!(node instanceof type)) throw new Error(`${selector}: узла нет`)

	return node
}

/** Разметка, подключённая к документу, и её отрисовка. */
async function mount(html: string): Promise<HTMLElement> {
	const host = document.createElement('div')

	host.innerHTML = html
	document.body.appendChild(host)
	await flush()

	return host
}

/** Аккордеон в разметке; нет его — тест падает здесь. */
function accordionIn(host: ParentNode): TAccordionElementProps {
	const node = host.querySelector('[is="so-accordion"]')

	if (!isAccordion(node)) throw new Error('<div is="so-accordion"> нет')

	return node
}

/** Аккордеон кодом: пропсы свойствами и свет — до вставки. */
async function mountAccordion(
	props: Record<string, unknown>,
	light = '',
): Promise<TAccordionElementProps> {
	const el = document.createElement('div', { is: 'so-accordion' })

	if (!isAccordion(el)) throw new Error('<div is="so-accordion"> нет')

	for (const [name, value] of Object.entries(props)) Reflect.set(el, name, value)

	el.innerHTML = light
	document.body.appendChild(el)
	await flush()

	return el
}

async function click(element: Element): Promise<void> {
	if (element instanceof HTMLElement) element.click()

	await flush()
}

/** Секции из разметки — как `Accordion.test.vue` у Vue. */
const HARNESS = `<div is="so-accordion" mode="multiple">
	<div is="so-accordion-item" text="Первый" value="a" selected><p>Содержимое A</p></div>
	<div is="so-accordion-item" text="Второй" value="b"><p>Содержимое B</p></div>
</div>`

const ITEMS = [
	{ value: 'a', text: 'Первый' },
	{ value: 'b', text: 'Второй' },
]

describe('связка ARIA заголовок ↔ панель', () => {
	it('aria-controls заголовка указывает на id панели, aria-labelledby — обратно', async () => {
		await mount(HARNESS)

		const [first] = headers()
		const [content] = contents()

		expect(first.getAttribute('aria-controls')).toBe(content.id)
		expect(content.getAttribute('aria-labelledby')).toBe(first.id)
	})

	it('панель объявлена как region', async () => {
		await mount(HARNESS)

		expect(contents()[0].getAttribute('role')).toBe('region')
	})

	it('id уникальны между элементами', async () => {
		await mount(HARNESS)

		const [first, second] = contents()

		expect(first.id).not.toBe(second.id)
	})

	it('содержимое секции — в её панели', async () => {
		await mount(HARNESS)

		expect(contents().map((content) => content.textContent)).toEqual([
			'Содержимое A',
			'Содержимое B',
		])
	})
})

describe('aria-expanded', () => {
	it('отражает раскрытость и стоит на заголовке, а не на обёртке', async () => {
		await mount(HARNESS)

		expect(header('Первый').getAttribute('aria-expanded')).toBe('true')
		expect(header('Второй').getAttribute('aria-expanded')).toBe('false')
		expect(sections()[0].hasAttribute('aria-selected')).toBe(false)
		expect(sections()[0].hasAttribute('aria-expanded')).toBe(false)
	})

	it('следует за раскрытием по клику', async () => {
		await mount(HARNESS)

		await click(header('Второй'))

		expect(header('Второй').getAttribute('aria-expanded')).toBe('true')
	})

	it('тема раскрывает панель по data-selected на корне секции', async () => {
		await mount(HARNESS)

		expect(sections().map((node) => node.getAttribute('data-selected'))).toEqual([
			'true',
			'false',
		])
	})

	/** Ряд секций — флексбокс: секция стоит по номеру в коллекции, а не по месту в разметке. */
	it('место в коллекции — order корня секции', async () => {
		await mount(HARNESS)

		expect(
			sections().map((node) => (node instanceof HTMLElement ? node.style.order : '')),
		).toEqual(['0', '1'])
	})
})

/**
 * `mode` у Accordion — регрессионный тест, как у Vue: до выноса фасадов на
 * общую базу `mode="multiple"` молча не работал, и вторая раскрытая секция
 * закрывала первую.
 */
describe('Accordion mode', () => {
	const open = () => sections().filter((node) => node.getAttribute('data-selected') === 'true')

	it('multiple держит две секции раскрытыми одновременно', async () => {
		await mount(HARNESS)

		await click(header('Второй'))

		expect(open()).toHaveLength(2)
	})

	it('single раскрывает одну: вторая закрывает первую', async () => {
		const el = accordionIn(await mount(HARNESS))

		el.mode = 'single'
		await flush()
		await click(header('Второй'))

		expect(open()).toHaveLength(1)
		expect(header('Второй').getAttribute('aria-expanded')).toBe('true')
	})

	it('атрибут mode — вход фасада: его смена доходит до коллекции', async () => {
		const el = accordionIn(await mount(HARNESS))

		el.setAttribute('mode', 'single')
		await flush()
		await click(header('Второй'))

		expect(open()).toHaveLength(1)
		expect(el.state.mode).toBe('single')
	})

	it('повторный клик сворачивает секцию, so:change:selection сообщает', async () => {
		const el = accordionIn(await mount(HARNESS))
		const selections: unknown[] = []

		el.addEventListener('so:change:selection', (event) => selections.push(event.type))
		await click(header('Первый'))

		expect(open()).toHaveLength(0)
		expect(selections.length).toBeGreaterThan(0)
	})
})

describe('секция из разметки', () => {
	it('клик потребителя по секции не отменяет раскрытие', async () => {
		await mount(`<div is="so-accordion">
			<div is="so-accordion-item" text="A" value="a"></div>
		</div>`)

		const clicks: unknown[] = []

		section('A').addEventListener('click', (event) => clicks.push(event.type))
		await click(header('A'))

		expect(clicks).toEqual(['click'])
		expect(header('A').getAttribute('aria-expanded')).toBe('true')
	})

	it('класс и стиль потребителя — корню секции, id, title, aria-label и data-* — заголовку', async () => {
		await mount(`<div is="so-accordion">
			<div
				is="so-accordion-item"
				text="A"
				value="a"
				class="mine"
				style="color: red"
				id="part-a"
				title="Раздел"
				aria-label="Раздел А"
				data-testid="part"
			></div>
		</div>`)

		const root = section('A')
		const row = header('A')

		expect(root.classList.contains('mine')).toBe(true)
		expect(root.style.color).toBe('red')
		expect(
			['id', 'title', 'aria-label', 'data-testid'].filter((n) => root.hasAttribute(n)),
		).toEqual([])
		expect(row.id).toBe('part-a')
		expect(row.getAttribute('title')).toBe('Раздел')
		expect(row.getAttribute('aria-label')).toBe('Раздел А')
		expect(row.dataset['testid']).toBe('part')
		expect(row.classList.contains('mine')).toBe(false)
	})

	/**
	 * `header` — свет заголовка: его слот `default`, то есть текст кнопки.
	 * Без него заголовку уходит текст секции. Слот заголовка — не содержимое
	 * панели.
	 */
	it('header — свет заголовка в его тексте, без него — text', async () => {
		await mount(`<div is="so-accordion">
			<div is="so-accordion-item" text="A" value="a"></div>
			<div is="so-accordion-item" text="C" value="c"><b slot="header">Свой</b></div>
		</div>`)

		expect(headers().map((node) => node.textContent?.trim())).toEqual(['A', 'Свой'])
		expect(find(header('Свой'), '.so-button__text b', HTMLElement).textContent).toBe('Свой')
		expect(contents().map((content) => content.textContent?.trim())).toEqual(['', ''])
	})

	it('leading и trailing — края заголовка, вокруг текста', async () => {
		await mount(`<div is="so-accordion">
			<div is="so-accordion-item" text="A" value="a">
				<i slot="trailing" class="tail">!</i>
				<i slot="leading" class="head">*</i>
			</div>
		</div>`)

		const row = header('*A!')
		const parts = [...row.children].map((node) =>
			node.classList.contains('so-accordion-item__arrow') ? 'arrow' : node.className,
		)

		expect(parts).toEqual(['arrow', 'head', 'so-button__text', 'tail'])
	})

	/**
	 * Стрелка — по краю заголовка со стороны `arrowPlacement`; слоты
	 * `leading-icon` и `trailing-icon` её подменяют. Подменённая стоит в той же
	 * обёртке `.so-accordion-item__arrow`: по ней тема поворачивает стрелку
	 * раскрытой секции, — и обёртка — ребёнок заголовка.
	 */
	it('стрелка стоит со стороны arrowPlacement и переезжает за ним', async () => {
		const host = await mount(`<div is="so-accordion">
			<div is="so-accordion-item" text="A" value="a"></div>
		</div>`)
		const arrowSide = () => {
			const arrow = find(host, '.so-accordion-item__arrow', Element)
			const text = find(host, '.so-accordion-item__header .so-button__text', HTMLElement)

			return arrow.compareDocumentPosition(text) & Node.DOCUMENT_POSITION_FOLLOWING
				? 'start'
				: 'end'
		}

		expect(arrowSide()).toBe('start')
		expect(find(host, '.so-accordion-item__arrow', Element).parentElement).toBe(header('A'))

		section('A').arrowPlacement = 'end'
		await flush()

		expect(arrowSide()).toBe('end')
		expect(host.querySelectorAll('.so-accordion-item__arrow')).toHaveLength(1)
		expect(header('A').lastElementChild?.classList.contains('so-accordion-item__arrow')).toBe(
			true,
		)

		section('A').arrowPlacement = 'start'
		await flush()

		expect(arrowSide()).toBe('start')
		expect(header('A').firstElementChild?.classList.contains('so-accordion-item__arrow')).toBe(
			true,
		)
	})

	it('слот на стороне стрелки подменяет её в той же обёртке', async () => {
		await mount(`<div is="so-accordion">
			<div is="so-accordion-item" text="A" value="a" arrow-placement="end">
				<b slot="trailing-icon" class="custom">›</b>
			</div>
		</div>`)

		expect(document.querySelectorAll('.so-accordion-item__arrow')).toHaveLength(1)
		expect(document.querySelector('.so-accordion-item__arrow .custom')).not.toBeNull()
		expect(document.querySelector('.so-accordion-item__arrow .so-icon')).toBeNull()
	})

	/** Слот на стороне без стрелки по умолчанию — своя обёртка, стрелка остаётся. */
	it('слот на другой стороне — своя обёртка, стрелка по умолчанию на месте', async () => {
		await mount(`<div is="so-accordion">
			<div is="so-accordion-item" text="A" value="a" arrow-placement="end">
				<b slot="leading-icon" class="custom">•</b>
			</div>
		</div>`)

		expect(
			[...document.querySelectorAll('.so-accordion-item__arrow')].map((arrow) =>
				arrow.querySelector('.custom')
					? 'slot'
					: arrow.querySelector('.so-icon')
						? 'icon'
						: 'empty',
			),
		).toEqual(['slot', 'icon'])
	})

	it('стрелка по умолчанию — деталь с именем места, роли arrowRight и размера секции', async () => {
		await mount(`<div is="so-accordion" size="lg">
			<div is="so-accordion-item" text="A" value="a"></div>
		</div>`)

		const icon = find(header('A'), '.so-accordion-item__arrow .so-icon', HTMLElement)

		expect(icon.getAttribute('embedded')).toBe('accordion.arrow')
		expect(icon.getAttribute('icon')).toBe('arrowRight')
		expect(icon.classList.contains('so-icon--size-lg')).toBe(true)
		expect(header('A').getAttribute('embedded')).toBe('accordion.header')
		expect(header('A').getAttribute('type')).toBe('button')
	})

	it('вид аккордеона — модификатор заголовка', async () => {
		await mount(`<div is="so-accordion" view="plain">
			<div is="so-accordion-item" text="A" value="a"></div>
		</div>`)

		expect(header('A').classList.contains('so-button--view-plain')).toBe(true)
	})
})

/**
 * Слоты секций из данных — образцы: scope у слотов Web Components нет, и
 * владелец кладёт копию одного образца в каждую свою секцию из данных — в её
 * слот, назначением, вместе с текстом. Таблица слотов — та же, что проброс у
 * остальных адаптеров: `header` секции — `item`, панель — `item-content`.
 */
describe('образцы item-* аккордеона', () => {
	it('копии в каждой секции из данных, в её слотах', async () => {
		await mountAccordion(
			{ items: ITEMS },
			`<template slot="item"><b class="own">Свой</b></template>
			<template slot="item-leading"><u class="lead">до</u></template>
			<template slot="item-trailing"><s class="trail">после</s></template>
			<template slot="item-content"><p class="body">Тело</p></template>`,
		)

		expect(
			headers().map((node) => node.querySelector('.so-button__text')?.textContent),
		).toEqual(['Свой', 'Свой'])
		expect(document.querySelectorAll('.so-accordion-item__header .lead')).toHaveLength(2)
		expect(document.querySelectorAll('.so-accordion-item__header .trail')).toHaveLength(2)
		expect(contents().map((content) => content.textContent)).toEqual(['Тело', 'Тело'])
	})

	/** Образец стрелки задан — у каждой секции он вместо стрелки по умолчанию. */
	it('item-leading-icon — у каждой секции вместо стрелки по умолчанию', async () => {
		await mountAccordion(
			{ items: ITEMS },
			'<template slot="item-leading-icon"><b class="probe">›</b></template>',
		)

		const arrows = sections().map((node) =>
			[...node.querySelectorAll('.so-accordion-item__arrow')].map((arrow) =>
				arrow.querySelector('.probe')
					? 'slot'
					: arrow.querySelector('.so-icon')
						? 'icon'
						: 'empty',
			),
		)

		expect(arrows).toEqual([['slot'], ['slot']])
	})

	/** Пустой образец ничего не кладёт: слот секции не задан, и стрелка — своя. */
	it('пустой образец — у секции своя стрелка', async () => {
		await mountAccordion({ items: ITEMS }, '<template slot="item-leading-icon"> </template>')

		expect(
			sections().map(
				(node) => node.querySelector('.so-accordion-item__arrow .so-icon') !== null,
			),
		).toEqual([true, true])
	})
})

describe('шаблоны объявляют ровно те слоты, что и дескрипторы', () => {
	it.each([
		['Accordion', accordionTemplate, AccordionDescriptor],
		['Accordion.Item', accordionItemTemplate, AccordionItemDescriptor],
	] as const)('%s', async (_name, template, descriptor) => {
		const root = document.createElement('div')
		const targets = template.create(root, bareContext(root)).slots

		expect(Object.keys(targets).sort()).toEqual(
			descriptor()
				.slots.map((slot) => slot.name)
				.sort(),
		)
	})
})

describe('типы', () => {
	it('пропсы фасада — свойства элементов', () => {
		expectTypeOf<TAccordionElementProps['mode']>().toEqualTypeOf<TSelectionMode | undefined>()
		expectTypeOf<TAccordionElementProps>().toHaveProperty('items')
		expectTypeOf<TAccordionElementProps>().toHaveProperty('engine')
		expectTypeOf<TAccordionItemElementProps['selected']>().toEqualTypeOf<boolean | undefined>()
	})

	it('состояние — вместе со свойствами фасада', () => {
		expectTypeOf<TAccordionElementProps['state']>().toHaveProperty('shown')
		expectTypeOf<TAccordionItemElementProps['state']>().toHaveProperty('order')
	})
})
