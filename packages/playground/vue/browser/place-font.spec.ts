/**
 * The font of the place in a real browser: the scales one step smaller than
 * their neighbour — Table cells and header labels and Calendar day numbers
 * smaller than a Button, the notes at a control (Field helper, Slider mark
 * labels, Textarea counter) smaller than the caption and the text of the field.
 *
 * The `normal` Button, field and caption have no font of their own and take
 * that of their place, so the `normal` step of each such scale is in `em`
 * (`themes/base/src/components/table.css`, `calendar.css`, `caption.css`). A
 * step fixed in `rem` equalled its neighbour at a 14px place (the stand) and
 * was smaller only at the 16px of the run page, so every check runs in both
 * places, at every size, against a neighbour of the same size. The other steps
 * are absolute and smaller in both places.
 *
 * The tag scale has the same check in `tags-close.spec.ts` («место %ipx»). The
 * month and year picker tiles of Calendar read the variable of the day number,
 * so the picker is not opened here; the group labels of `lg` rows read the
 * `normal` note step and are held to the Field helper of one size smaller by
 * `list-groups.spec.ts`.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { render } from './render'
import { defineComponent, h, nextTick, type VNode } from 'vue'
import { createEngineTable } from '@soldy-ui/core'
import type { TTableCollection } from '@soldy-ui/core'
import { COMPONENT_SIZES } from '@soldy-ui/playground-shared'
import { Button, Calendar, Field, Input, Slider, Table, Textarea } from '@soldy-ui/vue'

import { find, style } from './colors'

import '@soldy-ui/theme-oren'

/** Font sizes of the places, px: that of the stand and the browser default of the run page. */
const PLACES = [14, 16] as const

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

/** The Button every check of a Button scale compares with. */
const button = (size: (typeof COMPONENT_SIZES)[number]) =>
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

beforeEach(() => {
	document.documentElement.dataset.soTheme = 'oren'
})

describe.each(PLACES)('место %ipx', (place) => {
	it.each(COMPONENT_SIZES)(
		'размер %s: текст ячейки и подпись шапки Table мельче Button',
		async (size) => {
			await show(place, () => [
				button(size),
				h(Table, { engine: engineOf(), size, aria_label: 'Сотрудники' }),
			])

			const action = fontOf(find('.so-test-button'))

			expect(fontOf(find('.so-table-row__cell')), 'ячейка').toBeLessThan(action)
			expect(fontOf(find('.so-table-column__text')), 'подпись шапки').toBeLessThan(action)
		},
	)

	it.each(COMPONENT_SIZES)('размер %s: номер дня Calendar мельче Button', async (size) => {
		await show(place, () => [button(size), h(Calendar, { months: ['2026-09-01'], size })])

		// Days come a frame after their calendar
		await expect
			.poll(() => document.querySelectorAll('.so-calendar-item__day').length)
			.toBeGreaterThan(0)

		expect(fontOf(find('.so-calendar-item__day'))).toBeLessThan(fontOf(find('.so-test-button')))
	})

	it.each(COMPONENT_SIZES)(
		'размер %s: справка мельче подписи Field и текста поля',
		async (size) => {
			await show(place, () => [
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
				h(Textarea, { size, value: 'Отзыв', maxlength: 200, counter: true }),
			])

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
})
