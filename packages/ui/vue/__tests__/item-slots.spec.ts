/**
 * Проброс слотов элементов владельцем — Vue.
 *
 * Элементы, заданные пропом `items`, рисует владелец, и каждый слот элемента у
 * него есть как `item-<слот>`: scope проброса — scope слота элемента плюс сам
 * элемент. Раньше проброс был неполным — отметку, крестик и стрелки при
 * `items` было не подменить — и терял данные: `text`, `selected` и `active`
 * держит элемент, и до слота владельца они не доходили.
 *
 * Состав пробросов сверяет сторож `setup/__tests__/item-slots.spec.ts`, места
 * `<slot>` в разметке — `slots.spec.ts`. Здесь — что данные доходят, меняются
 * вместе с элементом, а иконку можно подменить одному элементу условием по
 * `item.value`.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import {
	Accordion,
	AccordionItem,
	ListBox,
	RadioGroup,
	RadioGroupItem,
	Select,
	Tabs,
	Tags,
} from '@soldy-ui/vue'

let wrapper: ReturnType<typeof mount> | null = null

afterEach(() => {
	wrapper?.unmount()
	wrapper = null
	document.body.innerHTML = ''
})

/**
 * Кадр: `press` строки тега приходит от `TActionPlugin`, а его слушатели
 * встают по `element:ready` — через кадр.
 */
const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

const ITEMS = [
	{ value: 'a', text: 'Первый' },
	{ value: 'b', text: 'Второй' },
]

/** Тексты узлов по селектору, по порядку. */
const texts = (selector: string) =>
	[...document.querySelectorAll(selector)].map((node) => node.textContent?.trim())

/** Узлы по селектору — те, на которых висит обработчик; нет нужного — тест падает здесь. */
const nth = (selector: string, index: number): HTMLElement => {
	const element = document.querySelectorAll(selector)[index]

	if (!(element instanceof HTMLElement)) throw new Error(`${selector} [${index}]: узла нет`)

	return element
}

/** Что лежит в каждом узле по селектору: метка подмены, иконка по умолчанию или ничего. */
const marks = (selector: string) =>
	[...document.querySelectorAll(selector)].map((node) =>
		node.querySelector('.probe') ? 'slot' : node.querySelector('svg') ? 'icon' : 'empty',
	)

/** Сценарий `#item`: значение, текст и состояние элемента — одной строкой. */
const ITEM_PROBE = (state: string) =>
	`<template #item="{ item, text, ${state} }"><b class="probe">{{ item.value }}:{{ text }}:{{ ${state} }}</b></template>`

describe('ListBox', () => {
	it('#item получает text и selected элемента, selected следует за выбором', async () => {
		wrapper = mount(ListBox, {
			props: { items: ITEMS },
			slots: { item: ITEM_PROBE('selected') },
			attachTo: document.body,
		})
		await nextTick()

		expect(texts('.probe')).toEqual(['a:Первый:false', 'b:Второй:false'])

		nth('.s-list-box-item .s-button', 1).click()
		await nextTick()

		expect(texts('.probe')).toEqual(['a:Первый:false', 'b:Второй:true'])
	})

	it('item-indicator-icon подменяет отметку одному элементу, у остальных — своя', async () => {
		wrapper = mount(ListBox, {
			props: { items: ITEMS, mode: 'multiple', indicator: 'start' },
			slots: {
				'item-indicator-icon': `<template #item-indicator-icon="{ item, selected }"><b v-if="item.value === 'a'" class="probe">{{ selected }}</b></template>`,
			},
			attachTo: document.body,
		})
		await nextTick()

		expect(marks('.s-list-box-item__indicator')).toEqual(['slot', 'empty'])
		expect(texts('.probe')).toEqual(['false'])

		nth('.s-list-box-item .s-button', 0).click()
		nth('.s-list-box-item .s-button', 1).click()
		await nextTick()

		expect(marks('.s-list-box-item__indicator')).toEqual(['slot', 'icon'])
		expect(texts('.probe')).toEqual(['true'])
	})

	it('без item-indicator-icon элемент из items рисует свою отметку', async () => {
		wrapper = mount(ListBox, {
			props: { items: ITEMS, indicator: 'start' },
			attachTo: document.body,
		})
		await nextTick()

		nth('.s-list-box-item .s-button', 1).click()
		await nextTick()

		expect(marks('.s-list-box-item__indicator')).toEqual(['empty', 'icon'])
	})

	it('empty — пока элементов нет: появились — пропал, ушли — вернулся', async () => {
		wrapper = mount(ListBox, {
			props: { items: [] },
			slots: {
				header: '<i class="head" />',
				empty: '<p class="probe">Пусто</p>',
				footer: '<i class="foot" />',
			},
			attachTo: document.body,
		})
		await nextTick()

		// На месте элементов: после шапки, перед подвалом
		expect(
			[...wrapper.element.children].map((child) => child.className || child.tagName),
		).toEqual(['head', 'probe', 'foot'])

		await wrapper.setProps({ items: ITEMS })

		expect(document.querySelector('.probe')).toBeNull()
		expect(texts('.s-list-box-item')).toEqual(['Первый', 'Второй'])

		await wrapper.setProps({ items: [] })

		expect(texts('.probe')).toEqual(['Пусто'])
	})
})

describe('Select', () => {
	/** Строка опции — носитель роли; клик всплывает к корню опции, где выбор. */
	const OPTION = '[role="option"]'

	it('#item получает text и selected опции, selected следует за выбором', async () => {
		wrapper = mount(Select, {
			props: { items: ITEMS },
			slots: { item: ITEM_PROBE('selected') },
			attachTo: document.body,
		})
		await nextTick()

		expect(texts('.probe')).toEqual(['a:Первый:false', 'b:Второй:false'])

		nth(OPTION, 1).click()
		await nextTick()

		expect(texts('.probe')).toEqual(['a:Первый:false', 'b:Второй:true'])
	})

	it('item-indicator-icon подменяет отметку одной опции, у остальных — своя', async () => {
		wrapper = mount(Select, {
			props: { items: ITEMS, mode: 'multiple', indicator: 'end' },
			slots: {
				'item-indicator-icon': `<template #item-indicator-icon="{ item, selected }"><b v-if="item.value === 'a'" class="probe">{{ selected }}</b></template>`,
			},
			attachTo: document.body,
		})
		await nextTick()

		nth(OPTION, 0).click()
		nth(OPTION, 1).click()
		await nextTick()

		expect(marks('.s-select-item__indicator')).toEqual(['slot', 'icon'])
		expect(texts('.probe')).toEqual(['true'])
	})
})

describe('Tabs', () => {
	const TABS = [{ value: 'a', text: 'Первый', _: { active: true } }, ITEMS[1]]

	it('#item получает text и active таба, active следует за активацией', async () => {
		wrapper = mount(Tabs, {
			props: { items: TABS },
			slots: { item: ITEM_PROBE('active') },
			attachTo: document.body,
		})
		await nextTick()

		expect(texts('.probe')).toEqual(['a:Первый:true', 'b:Второй:false'])

		nth('[role="tab"]', 1).click()
		await nextTick()

		expect(texts('.probe')).toEqual(['a:Первый:false', 'b:Второй:true'])
	})

	it('item-close-icon подменяет иконку крестика одному табу, у остальных — своя', async () => {
		wrapper = mount(Tabs, {
			props: { items: TABS, closable: true },
			slots: {
				'item-close-icon': `<template #item-close-icon="{ item }"><b v-if="item.value === 'a'" class="probe">×</b></template>`,
			},
			attachTo: document.body,
		})
		await nextTick()

		expect(marks('.s-tabs-item__close')).toEqual(['slot', 'icon'])
	})
})

describe('Tags', () => {
	it('#item получает text и selected тега, selected следует за выбором', async () => {
		wrapper = mount(Tags, {
			props: { items: ITEMS, mode: 'multiple' },
			slots: { item: ITEM_PROBE('selected') },
			attachTo: document.body,
		})
		await nextTick()
		await nextFrame()

		expect(texts('.probe')).toEqual(['a:Первый:false', 'b:Второй:false'])

		nth('.s-tags-item > .s-button:first-child', 1).click()
		await nextTick()

		expect(texts('.probe')).toEqual(['a:Первый:false', 'b:Второй:true'])
	})

	it('item-close-icon подменяет иконку крестика одному тегу, у остальных — своя', async () => {
		wrapper = mount(Tags, {
			props: { items: ITEMS, closable: true },
			slots: {
				'item-close-icon': `<template #item-close-icon="{ item }"><b v-if="item.value === 'b'" class="probe">×</b></template>`,
			},
			attachTo: document.body,
		})
		await nextTick()

		expect(marks('.s-tags-item__close')).toEqual(['icon', 'slot'])
	})
})

describe('Accordion', () => {
	/** Стрелки секций по порядку: у каждой — с какой стороны и что в обёртке. */
	const arrows = () =>
		[...document.querySelectorAll('.s-accordion-item__header')].map((header) =>
			[...header.querySelectorAll(':scope > .s-accordion-item__arrow')].map((arrow) => {
				const text = header.querySelector(':scope > .s-button__text')
				const side =
					text && arrow.compareDocumentPosition(text) & Node.DOCUMENT_POSITION_FOLLOWING
						? 'start'
						: 'end'

				return `${side}:${arrow.querySelector('.probe') ? 'slot' : arrow.querySelector('svg') ? 'icon' : 'empty'}`
			}),
		)

	it('#item получает text и selected секции, selected следует за раскрытием', async () => {
		wrapper = mount(Accordion, {
			props: { items: ITEMS },
			slots: { item: ITEM_PROBE('selected') },
			attachTo: document.body,
		})
		await nextTick()

		expect(texts('.probe')).toEqual(['a:Первый:false', 'b:Второй:false'])

		nth('.s-accordion-item__header', 1).click()
		await nextTick()

		expect(texts('.probe')).toEqual(['a:Первый:false', 'b:Второй:true'])
	})

	/**
	 * Класс стрелки — на обёртке: подменённая иконка лежит в ней, и тема
	 * поворачивает её так же, как стрелку по умолчанию. Сам поворот видно
	 * только в браузере (`playground/vue/browser/accordion.spec.ts`).
	 */
	it('item-leading-icon подменяет стрелку одной секции, в той же обёртке', async () => {
		wrapper = mount(Accordion, {
			props: { items: ITEMS },
			slots: {
				'item-leading-icon': `<template #item-leading-icon="{ item }"><b v-if="item.value === 'a'" class="probe">›</b></template>`,
			},
			attachTo: document.body,
		})
		await nextTick()

		expect(arrows()).toEqual([['start:slot'], ['start:icon']])
	})

	/**
	 * Стрелка по умолчанию — в начале (`arrowPlacement="start"`), поэтому у
	 * секции, которой слот в конце ничего не нарисовал, обёртка в конце пуста:
	 * слот задан. Пустую обёртку прячет тема по `:empty`, поэтому в ней нет ни
	 * узла, ни текста. Сам селектор проверяет браузер
	 * (`playground/vue/browser/accordion.spec.ts`): jsdom считает содержимым и
	 * текстовые узлы нулевой длины — якоря фрагментов Vue, — а по спецификации
	 * и в браузере они пустоте не мешают.
	 */
	it('item-trailing-icon: у секции без подмены обёртка в конце пуста', async () => {
		wrapper = mount(Accordion, {
			props: { items: ITEMS },
			slots: {
				'item-trailing-icon': `<template #item-trailing-icon="{ item }"><b v-if="item.value === 'b'" class="probe">›</b></template>`,
			},
			attachTo: document.body,
		})
		await nextTick()

		expect(arrows()).toEqual([
			['start:icon', 'end:empty'],
			['start:icon', 'end:slot'],
		])

		const empty = [...document.querySelectorAll('.s-accordion-item__arrow')].filter(
			(arrow) => !arrow.querySelector('.probe, svg'),
		)

		expect(empty.map((arrow) => [arrow.children.length, arrow.textContent])).toEqual([[0, '']])
	})

	it('без слотов стрелок обёртка одна — со стороны arrowPlacement', async () => {
		wrapper = mount(
			{
				components: { Accordion, AccordionItem },
				template: `
					<Accordion>
						<AccordionItem value="a" text="A" />
						<AccordionItem value="b" text="B" arrowPlacement="end" />
					</Accordion>
				`,
			},
			{ attachTo: document.body },
		)
		await nextTick()

		expect(arrows()).toEqual([['start:icon'], ['end:icon']])
	})
})

describe('RadioGroup', () => {
	it('#item получает радио и его отметку, отметка следует за значением', async () => {
		wrapper = mount(RadioGroup, {
			props: { value: 'b', items: [{ value: 'a' }, { value: 'b' }] },
			slots: {
				item: `<template #item="{ item, active }">{{ item.value }}:{{ active }}</template>`,
			},
			attachTo: document.body,
		})
		await nextTick()

		expect(texts('.s-radio-group-item__text')).toEqual(['a:false', 'b:true'])

		await wrapper.setProps({ value: 'a' })

		expect(texts('.s-radio-group-item__text')).toEqual(['a:true', 'b:false'])
	})

	it('подпись RadioGroup.Item получает active', async () => {
		wrapper = mount(
			{
				components: { RadioGroup, RadioGroupItem },
				template: `
					<RadioGroup value="b">
						<RadioGroupItem value="a" v-slot="{ active }">{{ active }}</RadioGroupItem>
						<RadioGroupItem value="b" v-slot="{ active }">{{ active }}</RadioGroupItem>
					</RadioGroup>
				`,
			},
			{ attachTo: document.body },
		)
		await nextTick()

		expect(texts('.s-radio-group-item__text')).toEqual(['false', 'true'])
	})
})
