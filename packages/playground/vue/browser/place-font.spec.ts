/**
 * The font of the place in a real browser: `normal` is the font of the place,
 * the text of the page, and every other size is a step from it, not a number
 * fitted to a 16px page (`themes/base/AGENTS.md`, «Перенос структуры»).
 *
 * Two ladders, both in steps of 2px. The text — Button, Pagination, the fields
 * and the captions — is the place at `normal`, 2px smaller at `sm` and 2px,
 * 4px and 8px larger at `lg`, `xl` and `2xl`. The scales one step smaller than
 * the text next to them — Table cells and header labels, Calendar day numbers,
 * the notes at a control (Field helper, Slider mark labels, Textarea counter),
 * tags and the group labels of ListBox — are the same ladder a step down. The
 * weekday labels of Calendar are a size below the day number (the same at
 * `sm`).
 *
 * Steps fixed in `rem` fitted a 16px place only: at 14px a `sm` Button was as
 * large as a `normal` one and a `lg` one 4px larger. So every check runs in
 * three places — 14px (the stand), 16px (the browser default of the run page)
 * and 18px — at every size, against the font of the place plus the step.
 *
 * The tag in the field of a Select is held to the text of the field by
 * `tags-close.spec.ts` («место %ipx»). The month and year picker tiles of
 * Calendar read the variable of the day number, so the picker is not opened
 * here.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { render } from './render'
import { defineComponent, h, nextTick, type VNode } from 'vue'
import { createEngineTable } from '@soldy-ui/core'
import type { TComponentSize, TTableCollection } from '@soldy-ui/core'
import { COMPONENT_SIZES } from '@soldy-ui/playground-shared'
import {
	Button,
	Calendar,
	DateInput,
	Field,
	Input,
	ListBox,
	NumberInput,
	Pagination,
	RadioGroup,
	Slider,
	Table,
	Tags,
	TagsItem,
	Textarea,
} from '@soldy-ui/vue'

import { find, style } from './colors'

import '@soldy-ui/theme-oren'

/**
 * Font sizes of the places, px: that of the stand, the browser default of the
 * run page and a larger one.
 */
const PLACES = [14, 16, 18] as const

/** Steps from the font of the place by size, px. */
const LADDERS = {
	text: { sm: -2, normal: 0, lg: 2, xl: 4, '2xl': 8 },
	smaller: { sm: -4, normal: -2, lg: 0, xl: 2, '2xl': 4 },
	weekday: { sm: -4, normal: -4, lg: -2, xl: 0, '2xl': 2 },
} as const satisfies Record<string, Record<TComponentSize, number>>

type TLadder = keyof typeof LADDERS

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/** Font size of a node, px. */
const fontOf = (element: Element) => parseFloat(style(element).fontSize)

/** Rows and columns of the table: it takes them only as data. */
function engineOf(): TTableCollection {
	const engine = createEngineTable({
		items: [{ data: { id: 1, name: 'Анна Смирнова', city: 'Казань' } }],
	})

	engine.extensions.columns.columns = [
		{ field: 'name', text: 'Имя' },
		{ field: 'city', text: 'Город' },
	]

	return engine
}

/**
 * A part at every size: its markup at a size and the nodes whose font is
 * measured, by name, each with its ladder.
 */
type TPart = {
	readonly name: string
	readonly markup: (size: TComponentSize) => VNode[]
	readonly nodes: Readonly<Record<string, readonly [selector: string, ladder: TLadder]>>
}

const PARTS: readonly TPart[] = [
	{
		name: 'Button',
		markup: (size) => [h(Button, { size, text: 'Сохранить' })],
		nodes: { кнопка: ['.so-button', 'text'] },
	},
	{
		name: 'Pagination',
		markup: (size) => [h(Pagination, { size, total: 100, value: 5, aria_label: 'Страницы' })],
		nodes: {
			страница: ['.so-pagination-item > .so-button', 'text'],
			стрелка: ['.so-pagination__prev', 'text'],
			пропуск: ['.so-pagination__ellipsis', 'text'],
		},
	},
	{
		name: 'поля',
		markup: (size) => [
			h(Input, { size, value: 'Анна', aria_label: 'Имя' }),
			h(NumberInput, { size, value: 5, aria_label: 'Количество' }),
			h(DateInput, { size, value: '2026-05-12', aria_label: 'Дата' }),
			h(Textarea, { size, value: 'Отзыв', maxlength: 200, counter: true }),
		],
		nodes: {
			'текст Input': ['.so-input input', 'text'],
			'текст NumberInput': ['.so-number-input__input', 'text'],
			'части DateInput': ['.so-date-input__segments', 'text'],
			'текст Textarea': ['.so-textarea > textarea', 'text'],
			'счётчик Textarea': ['.so-textarea__counter', 'smaller'],
		},
	},
	{
		name: 'подпись и справка',
		markup: (size) => [
			h('div', { class: 'so-test-helper' }, [
				h(Field, { size, label: 'Почта', helper: 'Не покажем никому' }, () =>
					h(Input, { size }),
				),
			]),
			h('div', { class: 'so-test-marks' }, [
				h(Field, { size, label: 'Громкость' }, () =>
					h(Slider, {
						size,
						value: 40,
						marks: [
							{ value: 0, label: 'Тихо' },
							{ value: 100, label: 'Громко' },
						],
					}),
				),
			]),
			h(RadioGroup, { size }, () => [h(RadioGroup.Item, { value: 'a' }, () => 'Курьером')]),
		],
		nodes: {
			'подпись Field': ['.so-test-helper .so-field__label', 'text'],
			'подсказка Field': ['.so-test-helper .so-field__helper', 'smaller'],
			'подпись метки Slider': ['.so-test-marks .so-slider__mark-label', 'smaller'],
			'текст радио': ['.so-radio-group-item', 'text'],
		},
	},
	{
		name: 'Table',
		markup: (size) => [h(Table, { engine: engineOf(), size, aria_label: 'Сотрудники' })],
		nodes: {
			ячейка: ['.so-table-row__cell', 'smaller'],
			'подпись шапки': ['.so-table-column__text', 'smaller'],
		},
	},
	{
		name: 'Calendar',
		markup: (size) => [h(Calendar, { months: ['2026-09-01'], size })],
		nodes: {
			'номер дня': ['.so-calendar-item__day', 'smaller'],
			'день недели': ['.so-calendar__weekday', 'weekday'],
			'заголовок месяца': ['.so-calendar__title', 'text'],
		},
	},
	{
		name: 'тег',
		markup: (size) => [
			h(Tags, { size, closable: true }, () => [
				h(TagsItem, { key: 'a', value: 'a', text: 'Настройки' }),
			]),
		],
		nodes: {
			'строка тега': ['.so-tags-item > .so-button:not(.so-tags-item__close)', 'smaller'],
			'крестик тега': ['.so-tags-item > .so-tags-item__close', 'smaller'],
		},
	},
	{
		name: 'группы ListBox',
		markup: (size) => [
			h(ListBox, {
				size,
				items: [{ value: 'apple', text: 'Яблоко', _: { group: 'fruit' } }],
				groups: [{ key: 'fruit', label: 'Фрукты' }],
			}),
		],
		nodes: {
			строка: ['.so-list-box-item > .so-button', 'text'],
			'подпись группы': ['.so-list-box-group__label', 'smaller'],
		},
	},
]

/** The part at every size, each in a wrapper of its size, in a place with its own font. */
async function show(place: number, part: TPart): Promise<void> {
	render(
		defineComponent({
			render: () =>
				h(
					'div',
					{ style: `font-size: ${place}px; width: 960px` },
					COMPONENT_SIZES.map((size) =>
						h('div', { class: `so-test-${size}` }, part.markup(size)),
					),
				),
		}),
	)

	await nextTick()
	await nextFrame()

	// Days come a frame after their calendar
	for (const size of COMPONENT_SIZES) {
		for (const [selector] of Object.values(part.nodes)) {
			await expect
				.poll(() => document.querySelectorAll(`.so-test-${size} ${selector}`).length)
				.toBeGreaterThan(0)
		}
	}
}

beforeEach(() => {
	document.documentElement.dataset.soTheme = 'oren'
})

describe.each(PLACES)('место %ipx', (place) => {
	it.each(PARTS)('$name: кегль места и шаг размера', async (part) => {
		await show(place, part)

		for (const size of COMPONENT_SIZES) {
			const wrapper = find(`.so-test-${size}`)

			for (const [name, [selector, ladder]] of Object.entries(part.nodes)) {
				expect(fontOf(find(selector, wrapper)), `${size}: ${name}`).toBeCloseTo(
					place + LADDERS[ladder][size],
					2,
				)
			}
		}
	})
})
