/**
 * The font of the place in a real browser: the scales one step smaller than
 * their neighbour — Table cells and header labels and Calendar day numbers
 * smaller than a Button, the notes at a control (Field helper, Slider mark
 * labels, Textarea counter) smaller than the caption and the text of the field,
 * a tag smaller than a Button and the text of a field.
 *
 * The `normal` Button, field and caption have no font of their own and take
 * that of their place, so the `normal` step of each such scale follows the
 * place: halfway between its font and the `sm` step, 12px
 * (`themes/base/src/components/table.css`, `calendar.css`, `tags.css` and
 * `caption.css`). A step fixed in `rem` equals its neighbour in one place, and
 * a fixed share of the place in `em` falls next to `sm` in a small place and
 * next to `lg` in a large one, so every check runs in three places: 14px (the
 * stand), 16px (the browser default of the run page) and 18px. At every size a
 * part is smaller than its neighbour of that size; at `normal` it is halfway
 * between the font of the place and the same part at `sm`, measured next to
 * it. The other steps are absolute.
 *
 * The tag is held to its neighbours at every size by `tags-close.spec.ts`
 * («место %ipx»), in a set and in the field of a Select. The month and year
 * picker tiles of Calendar read the variable of the day number, so the picker
 * is not opened here; the group labels of `lg` rows read the `normal` note step
 * and are held to the Field helper of one size smaller by `list-groups.spec.ts`.
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
	Field,
	Input,
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

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/** A place with its own font and the markup of the check in it. */
async function show(place: number, content: () => VNode[]): Promise<void> {
	render(
		defineComponent({
			render: () => h('div', { style: `font-size: ${place}px; width: 960px` }, content()),
		}),
	)

	await nextTick()
	await nextFrame()
}

/** Font size of a node, px. */
const fontOf = (element: Element) => parseFloat(style(element).fontSize)

/** Halfway between the font of the place and that of the same part at `sm`, px. */
const halfway = (place: number, sm: number) => (place + sm) / 2

/** The Button every check of a Button scale compares with. */
const button = (size: TComponentSize) =>
	h(Button, { class: 'so-test-button', size, text: 'Сохранить' })

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

const table = (size: TComponentSize) =>
	h(Table, { engine: engineOf(), size, aria_label: 'Сотрудники' })

const calendar = (size: TComponentSize) => h(Calendar, { months: ['2026-09-01'], size })

/** A Field with a helper, a Field with a Slider with mark labels and a Textarea with a counter. */
const notes = (size: TComponentSize) => [
	h('div', { class: 'so-test-helper' }, [
		h(Field, { size, label: 'Почта', helper: 'Не покажем никому' }, () => h(Input, { size })),
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
	h(Textarea, { size, value: 'Отзыв', maxlength: 200, counter: true }),
]

const tags = (size: TComponentSize) =>
	h(Tags, { size, closable: true }, () => [
		h(TagsItem, { key: 'a', value: 'a', text: 'Настройки' }),
	])

/**
 * A part at `normal` against the same part at `sm`: its markup at a size and
 * the nodes whose font is measured, by name.
 */
type TPart = {
	readonly name: string
	readonly markup: (size: TComponentSize) => VNode[]
	readonly nodes: Readonly<Record<string, string>>
}

const PARTS: readonly TPart[] = [
	{
		name: 'Table',
		markup: (size) => [table(size)],
		nodes: { ячейка: '.so-table-row__cell', 'подпись шапки': '.so-table-column__text' },
	},
	{
		name: 'Calendar',
		markup: (size) => [calendar(size)],
		nodes: { 'номер дня': '.so-calendar-item__day' },
	},
	{
		name: 'справка при контроле',
		markup: notes,
		nodes: {
			'подсказка Field': '.so-test-helper .so-field__helper',
			'подпись метки Slider': '.so-test-marks .so-slider__mark-label',
			'счётчик Textarea': '.so-textarea__counter',
		},
	},
	{
		name: 'тег',
		markup: (size) => [tags(size)],
		nodes: {
			'строка тега': '.so-tags-item > .so-button:not(.so-tags-item__close)',
			'крестик тега': '.so-tags-item > .so-tags-item__close',
		},
	},
]

/** The same parts at several sizes, each in a wrapper of its size. */
async function showSizes(
	place: number,
	sizes: readonly TComponentSize[],
	markup: (size: TComponentSize) => VNode[],
	selectors: readonly string[],
): Promise<void> {
	await show(place, () =>
		sizes.map((size) => h('div', { class: `so-test-${size}` }, markup(size))),
	)

	// Days come a frame after their calendar
	for (const size of sizes) {
		for (const selector of selectors) {
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
	it.each(COMPONENT_SIZES)(
		'размер %s: текст ячейки и подпись шапки Table мельче Button',
		async (size) => {
			await show(place, () => [button(size), table(size)])

			const action = fontOf(find('.so-test-button'))

			expect(fontOf(find('.so-table-row__cell')), 'ячейка').toBeLessThan(action)
			expect(fontOf(find('.so-table-column__text')), 'подпись шапки').toBeLessThan(action)
		},
	)

	it.each(COMPONENT_SIZES)('размер %s: номер дня Calendar мельче Button', async (size) => {
		await show(place, () => [button(size), calendar(size)])

		// Days come a frame after their calendar
		await expect
			.poll(() => document.querySelectorAll('.so-calendar-item__day').length)
			.toBeGreaterThan(0)

		expect(fontOf(find('.so-calendar-item__day'))).toBeLessThan(fontOf(find('.so-test-button')))
	})

	it.each(COMPONENT_SIZES)(
		'размер %s: справка мельче подписи Field и текста поля',
		async (size) => {
			await show(place, () => notes(size))

			const helper = find('.so-test-helper')
			const marks = find('.so-test-marks')
			const textarea = find('.so-textarea')

			expect(fontOf(find('.so-field__helper', helper)), 'подсказка Field').toBeLessThan(
				fontOf(find('.so-field__label', helper)),
			)
			expect(
				fontOf(find('.so-slider__mark-label', marks)),
				'подпись метки Slider',
			).toBeLessThan(fontOf(find('.so-field__label', marks)))
			expect(
				fontOf(find('.so-textarea__counter', textarea)),
				'счётчик Textarea',
			).toBeLessThan(fontOf(find(':scope > textarea', textarea)))
		},
	)

	it.each(PARTS)(
		'normal: $name — посередине между кеглем места и той же частью sm',
		async ({ markup, nodes }) => {
			await showSizes(place, ['sm', 'normal'], markup, Object.values(nodes))

			const sm = find('.so-test-sm')
			const normal = find('.so-test-normal')

			for (const [name, selector] of Object.entries(nodes)) {
				expect(fontOf(find(selector, normal)), name).toBeCloseTo(
					halfway(place, fontOf(find(selector, sm))),
					2,
				)
			}
		},
	)

	it('lg: подпись дня недели Calendar — на размер ниже, кеглем номера дня normal', async () => {
		await showSizes(place, ['normal', 'lg'], (size) => [calendar(size)], [
			'.so-calendar-item__day',
			'.so-calendar__weekday',
		])

		expect(fontOf(find('.so-test-lg .so-calendar__weekday'))).toBeCloseTo(
			fontOf(find('.so-test-normal .so-calendar-item__day')),
			2,
		)
	})
})
