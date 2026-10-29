/**
 * Calendar in a real browser — layout and focus.
 *
 * What jsdom doesn't compute at all. Layout: a month's height fits six weeks in
 * any month — the grid doesn't jump while paging, and neighbouring months stand
 * level, — the focus ring fits a day's cell, and the month and year picker: the
 * backdrop over the whole calendar and the card at its top edge — full width at
 * any number of grids, content height, the gesture strip at its bottom, the rim
 * in forced colors mode, — the list of 4 columns by 3 rows, month and year
 * labels that wrap between words and don't break a word, a word wider than the
 * tile cut by an ellipsis, and the weekday labels — short and narrow, on both
 * sides of the core rule, — in their columns and under the card. Focus: the
 * Tab order, `:focus-visible`, a click from Enter on a paging button, moving
 * the DOM focus after the collection's focus when the new day's node appears a
 * frame later, and the focus path through the picker — after a press on the
 * backdrop and a gesture too. Colour: the "today" frame is the pair of the
 * Button `outlined` frame, visible on a veil too. The core checks the model,
 * plugin tests the keys and the pointer, `ui/vue/__tests__/calendar.spec.ts`
 * the wiring.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from './render'
import { commands, page, userEvent } from 'vitest/browser'
import { defineComponent, h, nextTick } from 'vue'
import { Button, Calendar, LocaleProvider } from '@soldy-ui/vue'
import { createEngineCalendar } from '@soldy-ui/core'
import type { TSwipe } from '@soldy-ui/core'
import { enUS, extendLocale } from '@soldy-ui/plugins'
import type { TLocale } from '@soldy-ui/plugins'
import { COMPONENT_SIZES } from '@soldy-ui/playground-shared'
import { loadHost } from '../src/hosts'

import { find, lightness, outlined, pixel, settled, style, systemColor } from './colors'
import { DIRECTION_CASES, pointing, setDir, sidesOf, type TLine } from './directions'
import { forcedColors } from './media'
import { forcedColorsRepaint } from './engine'
import { expectHidesWhenFaded, ownTransitions, whileLeaving } from './transitions'

import '@soldy-ui/theme-oren'

/** Tolerance for subpixel rounding of coordinates. */
const EPSILON = 0.5

/** The gesture strip's grip zone — at least 24px: the target minimum of WCAG 2.5.8. */
const GRIP_ZONE = 24

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/**
 * The calendar between two buttons — to have where to Tab in from and out to.
 * Plugins get the root node a frame later, the days later than their owner.
 * `dir` is the direction of the node the calendar stands in.
 */
const show = async (props: Record<string, unknown>, dir?: TLine, locale: TLocale = enUS) => {
	render(
		defineComponent({
			render: () =>
				h(LocaleProvider, { locale }, () =>
					h('div', { class: 'so-host', dir }, [
						h('button', { class: 'so-test-before' }, 'До'),
						h(Calendar, props),
						h('button', { class: 'so-test-after' }, 'После'),
					]),
				),
		}),
	)

	await nextTick()
	await nextFrame()
	await nextFrame()
}

/**
 * The same calendar under a provider with language `tag`: the calendar has no
 * language of its own, it is the subtree locale's tag. The strings are
 * English, they don't matter for the layout.
 */
const showIn = (tag: string, props: Record<string, unknown>) =>
	show(props, undefined, extendLocale(enUS, { tag }))

const findAll = (selector: string): HTMLElement[] =>
	[...document.querySelectorAll(selector)].filter(
		(node): node is HTMLElement => node instanceof HTMLElement,
	)

/**
 * The box of the node's text lines themselves, not of its box: a tile's label
 * area spans the whole tile, a weekday column is wider than the name. Text cut
 * by an ellipsis it returns whole — as wide as the text asks.
 */
const labelBox = (node: HTMLElement) => {
	const range = document.createRange()

	range.selectNodeContents(node)

	return range.getBoundingClientRect()
}

/** A day's cell by date — by its name, the full date as a screen reader reads it. */
const dayCell = (date: string): HTMLElement => {
	const [year, month, day] = date.split('-').map(Number)
	const label = new Intl.DateTimeFormat('en-US', { dateStyle: 'full', timeZone: 'UTC' }).format(
		Date.UTC(year, month - 1, day),
	)

	return find(`.so-calendar-item[aria-label="${label}"]`)
}

const titles = () => findAll('.so-calendar__title').map((title) => title.textContent?.trim())

const tab = () => userEvent.keyboard('{Tab}')

beforeEach(async () => {
	document.documentElement.dataset.soTheme = 'oren'
	// Three months in a row: in a narrow window they wrap
	await page.viewport(1000, 700)
})

afterEach(() => {
	cleanup()
	setDir(document.documentElement)
})

describe('высота месяца', () => {
	/**
	 * February 2026 from Sunday is exactly four weeks, August is six.
	 * Neighbours share one row of titles, and their weeks stand level only if
	 * a month keeps room for six weeks at any length.
	 */
	it('месяцы в четыре и шесть недель одной высоты', async () => {
		await show({ months: ['2026-02-01', '2026-08-01'] })

		const [february, august] = findAll('.so-calendar__month')

		expect(february.querySelectorAll('.so-calendar__week')).toHaveLength(4)
		expect(august.querySelectorAll('.so-calendar__week')).toHaveLength(6)
		expect(
			Math.abs(
				february.getBoundingClientRect().height - august.getBoundingClientRect().height,
			),
		).toBeLessThanOrEqual(EPSILON)
	})

	it('листание по месяцам разной длины не меняет высоту календаря', async () => {
		await show({ months: ['2026-02-01'] })

		const root = find('.so-calendar')
		const height = root.getBoundingClientRect().height

		// March has five weeks, April five, May six
		for (const title of ['March 2026', 'April 2026', 'May 2026']) {
			find('.so-calendar__next').click()
			await expect.poll(titles).toEqual([title])

			expect(Math.abs(root.getBoundingClientRect().height - height)).toBeLessThanOrEqual(
				EPSILON,
			)
		}
	})
})

describe('кольцо фокуса', () => {
	/**
	 * The day's tile draws the ring, and the cell is wider than the tile by a
	 * margin. Neighbouring days stand close, and a ring past the cell would lie
	 * on the neighbour.
	 */
	it('кольцо дня помещается в его ячейку', async () => {
		await show({ months: ['2026-09-01'], value: '2026-09-16' })

		find('.so-test-before').focus()
		await tab()
		await tab()
		await tab()
		await tab()

		const cell = dayCell('2026-09-16')

		expect(document.activeElement).toBe(cell)

		const tile = cell.querySelector('.so-calendar-item__day')

		if (!tile) throw new Error('у дня нет плитки')

		const { outlineStyle, outlineWidth, outlineOffset } = getComputedStyle(tile)
		const ring = parseFloat(outlineWidth) + parseFloat(outlineOffset)
		const box = tile.getBoundingClientRect()
		const room = cell.getBoundingClientRect()

		expect(outlineStyle).not.toBe('none')
		expect(parseFloat(outlineWidth)).toBeGreaterThan(0)
		expect(box.left - ring).toBeGreaterThanOrEqual(room.left - EPSILON)
		expect(box.right + ring).toBeLessThanOrEqual(room.right + EPSILON)
		expect(box.top - ring).toBeGreaterThanOrEqual(room.top - EPSILON)
		expect(box.bottom + ring).toBeLessThanOrEqual(room.bottom + EPSILON)
	})
})

describe('фокус', () => {
	/**
	 * Tab follows the eye: the first month's title at the row's start, then the
	 * pair of paging buttons, then the next months' titles and one stop for all
	 * the grids.
	 */
	it('Tab проходит заголовок первого месяца, «назад», «вперёд», заголовки следующих и одну остановку на все сетки', async () => {
		await show({ months: ['2026-09-01', '2026-10-01'], value: '2026-10-05' })

		const [september, october] = findAll('.so-calendar__title')

		find('.so-test-before').focus()

		await tab()
		expect(document.activeElement).toBe(september)

		await tab()
		expect(document.activeElement).toBe(find('.so-calendar__prev'))

		await tab()
		expect(document.activeElement).toBe(find('.so-calendar__next'))

		await tab()
		expect(document.activeElement).toBe(october)

		await tab()
		expect(document.activeElement).toBe(dayCell('2026-10-05'))

		await tab()
		expect(document.activeElement).toBe(find('.so-test-after'))
	})

	it('стрелки ведут фокус по дням, в RTL ← — к следующему дню', async () => {
		await show({ months: ['2026-09-01'], value: '2026-09-16' }, 'rtl')

		dayCell('2026-09-16').focus()
		await userEvent.keyboard('{ArrowLeft}')

		expect(document.activeElement).toBe(dayCell('2026-09-17'))

		await userEvent.keyboard('{ArrowDown}')

		expect(document.activeElement).toBe(dayCell('2026-09-24'))
	})

	it('PageDown уводит сетку в следующий месяц, фокус — на день нового месяца', async () => {
		await show({ months: ['2026-09-01'], value: '2026-09-16' })

		dayCell('2026-09-16').focus()
		await userEvent.keyboard('{PageDown}')

		await expect.poll(titles).toEqual(['October 2026'])
		await expect.poll(() => document.activeElement).toBe(dayCell('2026-10-16'))
	})

	it('Enter на кнопке листает, и фокус остаётся на ней', async () => {
		await show({ months: ['2026-09-01'], value: '2026-09-16' })

		find('.so-calendar__next').focus()
		await userEvent.keyboard('{Enter}')

		await expect.poll(titles).toEqual(['October 2026'])
		expect(document.activeElement).toBe(find('.so-calendar__next'))
	})

	/**
	 * A disabled button loses focus, and it would fall to the page. The plugin
	 * moves it to the grid's stop — the day the collection's focus went to.
	 */
	it('кнопка погасла у границы под фокусом — фокус на день сетки', async () => {
		await show({ months: ['2026-09-01'], value: '2026-09-16', max: '2026-10-31' })

		find('.so-calendar__next').focus()
		await userEvent.keyboard('{Enter}')

		await expect.poll(titles).toEqual(['October 2026'])
		expect(find('.so-calendar__next').hasAttribute('disabled')).toBe(true)
		await expect.poll(() => document.activeElement).toBe(dayCell('2026-10-16'))
	})
})

/**
 * The arrows are what the theme mirrors itself: the icon role is one,
 * `arrowRight`, and an arrow has no logical directions. The theme takes the
 * sign from the nearest `dir`, as the browser takes the layout's direction, so
 * a calendar with `direction="ltr"` under an RTL ancestor stays an LTR calendar
 * whole (`browser/directions.ts`). The month and year picker lies in the
 * calendar, and its arrows follow it.
 */
describe.each(DIRECTION_CASES)('стрелки по ближайшему dir: $name', (scenario) => {
	const { start, end } = sidesOf(scenario.line)

	it('«назад» смотрит в начало строки, «вперёд» — в конец: у листания и в панели выбора', async () => {
		setDir(document.documentElement, scenario.page)
		await show({ months: ['2026-09-01'], direction: scenario.direction }, scenario.ancestor)

		expect(pointing('.so-calendar__prev'), 'листание «назад»').toBe(start)
		expect(pointing('.so-calendar__next'), 'листание «вперёд»').toBe(end)

		await userEvent.click(find('.so-calendar__title'))
		await expect
			.poll(() => findAll('.so-calendar__picker-list .so-list-box-item').length)
			.toBe(12)

		expect(pointing('.so-calendar__picker-prev'), 'панель «назад»').toBe(start)
		expect(pointing('.so-calendar__picker-next'), 'панель «вперёд»').toBe(end)
	})
})

/** The node's box. */
const rectOf = (node: Element) => node.getBoundingClientRect()

/**
 * The day tile in column `column` (0 is the first weekday) of the month's
 * second week: the second week is always wholly in its month, with no fillers.
 */
const tileIn = (month: Element, column: number): DOMRect => {
	const tile = month
		.querySelectorAll('.so-calendar__week')[1]
		?.children[column]?.querySelector('.so-calendar-item__day')

	if (!tile) throw new Error(`колонка ${column}: плитки нет`)

	return rectOf(tile)
}

/** The boxes' edges along the line match — with a subpixel tolerance. */
const expectSameColumn = (actual: DOMRect, expected: DOMRect, what: string) => {
	expect(Math.abs(actual.left - expected.left), `${what}: левый край`).toBeLessThanOrEqual(
		EPSILON,
	)
	expect(Math.abs(actual.right - expected.right), `${what}: правый край`).toBeLessThanOrEqual(
		EPSILON,
	)
}

/** The box's vertical centre. */
const middle = (rect: DOMRect) => rect.top + rect.height / 2

/**
 * The header is as in the Android calendar: the month's title at the row's
 * start, level with the first column's tile, and "previous" and "next" close
 * together at the end, over the sixth and seventh columns' tiles. The month and
 * year picker's header is the same: the year at the start, the arrows close
 * together at the end with the same gap. The sides are logical: in RTL the
 * title is on the right, the arrows on the left. The cases are
 * `browser/directions.ts`: the nearest `dir` decides.
 */
describe.each(DIRECTION_CASES)('шапка по ближайшему dir: $name', (scenario) => {
	const { start, end } = sidesOf(scenario.line)

	/** The gap between boxes along the line — from the first's end to the second's start. */
	const between = (first: DOMRect, second: DOMRect) =>
		scenario.line === 'ltr' ? second.left - first.right : first.left - second.right

	it('заголовок у начала, стрелки над двумя последними колонками; в панели — год у начала, стрелки у конца', async () => {
		setDir(document.documentElement, scenario.page)
		await show({ months: ['2026-09-01'], direction: scenario.direction }, scenario.ancestor)

		const month = find('.so-calendar__month')
		const title = rectOf(find('.so-calendar__title'))
		const prev = rectOf(find('.so-calendar__prev'))
		const next = rectOf(find('.so-calendar__next'))

		expect(
			Math.abs(title[start] - tileIn(month, 0)[start]),
			'заголовок — вровень с первой колонкой',
		).toBeLessThanOrEqual(EPSILON)
		expectSameColumn(prev, tileIn(month, 5), '«назад» над шестой колонкой')
		expectSameColumn(next, tileIn(month, 6), '«вперёд» над седьмой колонкой')

		// One row, and the title doesn't run into the arrows
		expect(Math.abs(middle(prev) - middle(title))).toBeLessThanOrEqual(EPSILON)
		expect(Math.abs(middle(next) - middle(title))).toBeLessThanOrEqual(EPSILON)
		expect(between(title, prev)).toBeGreaterThanOrEqual(-EPSILON)

		const gap = between(prev, next)

		await userEvent.click(find('.so-calendar__title'))
		await expect
			.poll(() => findAll('.so-calendar__picker-list .so-list-box-item').length)
			.toBe(12)

		const header = rectOf(find('.so-calendar__picker-header'))
		const heading = rectOf(find('.so-calendar__picker-heading'))
		const pickerPrev = rectOf(find('.so-calendar__picker-prev'))
		const pickerNext = rectOf(find('.so-calendar__picker-next'))

		expect(Math.abs(heading[start] - header[start]), 'год — у начала').toBeLessThanOrEqual(
			EPSILON,
		)
		expect(Math.abs(pickerNext[end] - header[end]), '«вперёд» — у конца').toBeLessThanOrEqual(
			EPSILON,
		)
		expect(
			Math.abs(between(pickerPrev, pickerNext) - gap),
			'стрелки вплотную, с зазором кнопок листания',
		).toBeLessThanOrEqual(EPSILON)
		expect(between(heading, pickerPrev), 'год на стрелки не заходит').toBeGreaterThan(0)
	})
})

/**
 * The footer is a line under the grids across the calendar's full width, only
 * when the slot is given. Its buttons stand at the line's end, level with the
 * last column's tile, and the months set the calendar's width: a footer in one
 * row with them would widen it, and the paging buttons would hang past the
 * last column.
 */
describe('подвал', () => {
	/** A calendar with a footer of buttons labelled `labels`. */
	const showWithFooter = async (
		props: Record<string, unknown>,
		labels: readonly string[],
		dir?: TLine,
	) => {
		render(
			defineComponent({
				render: () =>
					h(LocaleProvider, { locale: enUS }, () =>
						h('div', { class: 'so-host', dir }, [
							h(Calendar, props, {
								footer: () =>
									labels.map((text) =>
										h(Button, { class: 'so-test-action', text }),
									),
							}),
						]),
					),
			}),
		)

		await nextTick()
		await nextFrame()
		await nextFrame()
	}

	it('без слота подвала нет', async () => {
		await show({ months: ['2026-09-01'] })

		expect(document.querySelector('.so-calendar__footer')).toBeNull()
	})

	it.each(['ltr', 'rtl'] as const)(
		'%s: под сетками, кнопки у конца строки — вровень с последней колонкой',
		async (line) => {
			await showWithFooter({ months: ['2026-09-01'] }, ['Cancel', 'OK'], line)

			const { end } = sidesOf(line)
			const footer = rectOf(find('.so-calendar__footer'))
			const actions = findAll('.so-test-action').map(rectOf)
			const last = actions[actions.length - 1]
			const month = find('.so-calendar__month')

			expect(footer.top).toBeGreaterThanOrEqual(rectOf(find('.so-calendar__grid')).bottom)
			expect(Math.abs(last[end] - tileIn(month, 6)[end])).toBeLessThanOrEqual(EPSILON)
			// The month sets the calendar's width
			expectSameColumn(rectOf(find('.so-calendar')), rectOf(month), 'календарь — по месяцу')
		},
	)

	it('кнопки шире месяца календарь не раздвигают: стрелки — над последними колонками', async () => {
		const wide = 'A very long action label that does not fit the month'

		await showWithFooter({ months: ['2026-09-01'], size: 'sm' }, [wide, wide], 'ltr')

		const month = find('.so-calendar__month')

		expectSameColumn(rectOf(find('.so-calendar')), rectOf(month), 'календарь — по месяцу')
		expectSameColumn(rectOf(find('.so-calendar__next')), tileIn(month, 6), '«вперёд»')
	})

	it('два месяца с подвалом — между ними прежний зазор, стрелки над последним', async () => {
		await showWithFooter({ months: ['2026-09-01', '2026-10-01'] }, ['Cancel', 'OK'], 'ltr')

		const [september, october] = findAll('.so-calendar__month')
		const gap = parseFloat(getComputedStyle(find('.so-calendar__months')).columnGap)

		expect(Math.abs(rectOf(october).left - rectOf(september).right - gap)).toBeLessThanOrEqual(
			EPSILON,
		)
		expectSameColumn(rectOf(find('.so-calendar__next')), tileIn(october, 6), '«вперёд»')
		expectSameColumn(rectOf(find('.so-calendar__prev')), tileIn(october, 5), '«назад»')
	})
})

describe('указатель', () => {
	it('предпросмотр диапазона идёт за указателем', async () => {
		await show({ months: ['2026-09-01'], value: undefined, mode: 'range' })

		await userEvent.click(dayCell('2026-09-10'))
		await userEvent.hover(dayCell('2026-09-13'))

		await expect.poll(() => findAll('.so-calendar-item[data-preview="true"]').length).toBe(4)

		await userEvent.click(dayCell('2026-09-13'))

		await expect
			.poll(() => findAll('.so-calendar-item[data-range-middle="true"]').length)
			.toBe(2)
		expect(findAll('.so-calendar-item[data-preview="true"]')).toHaveLength(0)
	})
})

/**
 * The "today" frame is the pair of the Button `outlined` frame: at rest the
 * same step as the button's frame, and on a veil — under hover and press, on
 * the range band and in the preview — a step stronger, like the button's frame
 * under hover. With a saturated step the frame burned brighter than any frame
 * nearby, and the resting step is too weak on a veil: in the dark scheme on the
 * DatePicker panel the band is almost its colour, and the frame vanished in it.
 *
 * The test doesn't know the palette, like the guard of Button views
 * (`button-view.spec.ts`): it compares the frame with the button's frame
 * beside it, and on a veil measures how far the frame moved off what is under
 * it toward the day's text.
 */
describe('рамка «сегодня»', () => {
	/** Both schemes: the frame vanished only in the dark one, and the rule is shared. */
	const SCHEMES = ['oren', 'oren-dark'] as const

	type TScheme = (typeof SCHEMES)[number]

	/**
	 * Where the calendar stands: on the page and in the DatePicker panel — it
	 * has the control surface, like the Select and Popover panels.
	 */
	const BACKDROPS = {
		страница: 'var(--so-neutral-50)',
		'панель DatePicker': 'var(--so-component-surface)',
	} as const

	type TBackdrop = keyof typeof BACKDROPS

	const CASES = SCHEMES.flatMap((scheme) =>
		(Object.keys(BACKDROPS) as TBackdrop[]).map((backdrop) => ({ scheme, backdrop })),
	)

	/** The frame's visibility threshold in OKLab lightness — the Button `outlined` frame's. */
	const VISIBLE_BORDER = 0.04

	/** Calendar props from the "today" date. */
	type TProps = (today: string) => Record<string, unknown>

	/** Today in UTC: a calendar with `timeZone: 'UTC'` marks the same day. */
	const todayInUtc = () => new Date().toISOString().slice(0, 10)

	/** A day in milliseconds. */
	const DAY = 24 * 60 * 60 * 1000

	/** The date `days` days from `date`. */
	const daysFrom = (date: string, days: number) =>
		new Date(Date.parse(date) + days * DAY).toISOString().slice(0, 10)

	/**
	 * A range from yesterday to tomorrow: today is its middle, on the band. The
	 * grid's month is set, and a selection in the next month doesn't move it.
	 */
	const band: TProps = (today) => ({
		mode: 'range',
		value: [daysFrom(today, -1), daysFrom(today, 1)],
	})

	/** The scene's row: the parts stand side by side, each of its own height. */
	const ROW = 'display: flex; gap: 8px; align-items: flex-start'

	/**
	 * The scene: on each backdrop the month with today and an `outlined` button
	 * beside it. The pointer is moved away from all parts.
	 */
	const showToday = async (scheme: TScheme, props: TProps = () => ({})) => {
		const today = todayInUtc()

		document.documentElement.dataset.soTheme = scheme
		render(
			defineComponent({
				render: () =>
					h('div', { style: ROW }, [
						h('div', { class: 'so-test-away', style: 'width: 24px; height: 24px' }),
						...Object.entries(BACKDROPS).map(([name, color]) =>
							h(
								'div',
								{
									key: name,
									'data-backdrop': name,
									style: `background: ${color}; padding: 8px; ${ROW}`,
								},
								[
									h(Calendar, {
										months: [`${today.slice(0, 7)}-01`],
										timeZone: 'UTC',
										...props(today),
									}),
									h(Button, { view: 'outlined', text: 'Рамка' }),
								],
							),
						),
					]),
			}),
		)

		await nextTick()
		await nextFrame()
		await nextFrame()
		await userEvent.hover(find('.so-test-away'))
		await settled(document.body)
	}

	/** The scene's parts on a backdrop: the backdrop, the button, the "today" day and its tile. */
	const partsOf = (backdrop: TBackdrop) => {
		const root = find(`[data-backdrop="${backdrop}"]`)
		const cell = find('.so-calendar-item[data-today="true"]', root)

		return {
			root,
			cell,
			tile: find('.so-calendar-item__day', cell),
			button: find('.so-button--view-outlined', root),
		}
	}

	/** The frame's colour as sRGB bytes: the browser's notation can't be compared. */
	const borderOf = (element: HTMLElement) => pixel([style(element).borderTopColor])

	it.each(CASES)('$scheme, $backdrop: в покое — цвета рамки outlined', async (scenario) => {
		await showToday(scenario.scheme)

		const { tile, button } = partsOf(scenario.backdrop)

		expect(borderOf(tile)).toEqual(borderOf(button))
	})

	it.each(CASES)(
		'$scheme, $backdrop: под наведением — цвета рамки outlined под наведением',
		async (scenario) => {
			await showToday(scenario.scheme)

			const { cell, tile, button } = partsOf(scenario.backdrop)

			await userEvent.hover(button)
			await settled(document.body)

			const hovered = borderOf(button)

			await userEvent.hover(cell)
			await settled(document.body)

			expect(borderOf(tile)).toEqual(hovered)
		},
	)

	/** The veil under the frame. */
	interface IVeil {
		name: string
		/** The calendar props it occurs with. */
		props: TProps
		/** Put it on and hold it while the measure runs. */
		hold: (cell: HTMLElement, measure: () => void) => Promise<void>
		/** The day's state it stands at. */
		state: string
		/** Its colour. */
		color: (cell: HTMLElement) => string
	}

	/** Hover and press paint the tile itself. */
	const tileVeil = (cell: HTMLElement) =>
		style(find('.so-calendar-item__day', cell)).backgroundColor

	/** The band and the preview lie under the tile — the cell's pseudo-element. */
	const bandVeil = (cell: HTMLElement) => style(cell, '::before').backgroundColor

	const VEILS: readonly IVeil[] = [
		{
			name: 'наведение',
			props: () => ({}),
			hold: async (cell, measure) => {
				await userEvent.hover(cell)
				await settled(document.body)
				measure()
			},
			state: ':hover',
			color: tileVeil,
		},
		{
			// Pressed and led the pointer away: the day has no hover anymore,
			// and the press veil holds until the release
			name: 'нажатие',
			props: () => ({}),
			hold: async (cell, measure) => {
				await userEvent.hover(cell)
				await commands.mouseDown()

				try {
					await userEvent.hover(find('.so-test-away'))
					await settled(document.body)
					measure()
				} finally {
					await commands.mouseUp()
				}
			},
			state: ':active:not(:hover)',
			color: tileVeil,
		},
		{
			name: 'лента',
			props: band,
			hold: async (_cell, measure) => measure(),
			state: '[data-range-middle="true"]',
			color: bandVeil,
		},
		{
			// The anchor is the "today" day itself. The pointer left, and the
			// preview runs from the anchor to the focus — to the same day
			name: 'предпросмотр',
			props: () => ({ mode: 'range' }),
			hold: async (cell, measure) => {
				await userEvent.click(cell)
				await userEvent.hover(find('.so-test-away'))
				await settled(document.body)
				measure()
			},
			state: '[data-preview="true"]',
			color: bandVeil,
		},
	]

	describe.each(VEILS)('на вуали: $name', (veil) => {
		it.each(CASES)(
			'$scheme, $backdrop: рамка уходит от вуали к тексту дня',
			async (scenario) => {
				await showToday(scenario.scheme, veil.props)

				const { root, cell, tile } = partsOf(scenario.backdrop)

				await veil.hold(cell, () => {
					expect(cell.matches(veil.state), veil.state).toBe(true)

					// Under the frame are the backdrop and the veil: the tile's
					// background lies under its frame too
					const under = [style(root).backgroundColor, veil.color(cell)]
					const base = lightness(under)
					const toward = Math.sign(lightness([...under, style(tile).color]) - base)
					const border =
						(lightness([...under, style(tile).borderTopColor]) - base) * toward

					expect(border).toBeGreaterThan(VISIBLE_BORDER)
				})
			},
		)
	})

	/**
	 * On a veil a variable swaps the step, not `border-color`: a frame rule on a
	 * veil would be stronger than the forced colors rule, and on the band's
	 * highlight the frame would stay the theme's step, not the highlight text.
	 */
	describe('принудительные цвета', () => {
		afterEach(async () => {
			await forcedColors('none')
		})

		it.each(SCHEMES)('%s: рамка на ленте — текстом подсветки', async (scheme) => {
			await forcedColors('active')
			await showToday(scheme, band)

			const { cell, tile } = partsOf('страница')

			expect(cell.dataset.rangeMiddle).toBe('true')
			expect(borderOf(tile)).toEqual(pixel([systemColor('HighlightText')]))
		})
	})
})

describe('выбор месяца и года', () => {
	const options = () => findAll('.so-calendar__picker-list .so-list-box-item')

	/** Distinct values, with a subpixel tolerance. */
	const distinct = (values: number[]) =>
		values.reduce<number[]>(
			(found, value) =>
				found.some((known) => Math.abs(known - value) <= EPSILON)
					? found
					: [...found, value],
			[],
		)

	/** The panel's transitions — its own and the card's — have played: the geometry is in place. */
	const settled = async () => {
		await nextFrame()
		await Promise.all(
			find('.so-popover__panel')
				.getAnimations({ subtree: true })
				.map((animation) => animation.finished.catch(() => undefined)),
		)
	}

	/** Open the panel by a press on the title and wait for it in place. */
	const open = async () => {
		await userEvent.click(find('.so-calendar__title'))
		await expect.poll(() => options().length).toBe(12)
		await settled()
	}

	/** The box of a node by selector. */
	const box = (selector: string) => find(selector).getBoundingClientRect()

	/** The same place and size — with a subpixel tolerance. */
	const expectSameBox = (actual: DOMRect, expected: DOMRect) => {
		for (const side of ['left', 'top', 'width', 'height'] as const) {
			expect(Math.abs(actual[side] - expected[side])).toBeLessThanOrEqual(EPSILON)
		}
	}

	/** The option's line and its label area. */
	const rowOf = (option: HTMLElement) => {
		const row = option.querySelector(':scope > .so-button')
		const text = row?.querySelector(':scope > .so-button__text')

		if (!(row instanceof HTMLElement) || !(text instanceof HTMLElement)) {
			throw new Error('у опции нет строки с подписью')
		}

		return { row, text }
	}

	/** Steps between neighbouring values in ascending order. */
	const steps = (values: number[]) =>
		[...values]
			.sort((a, b) => a - b)
			.flatMap((value, i, sorted) => (i ? [value - sorted[i - 1]] : []))

	/**
	 * 12 options — 4 columns by 3 rows, the header above the list. Cells are
	 * equal in width and height, a line fills its cell, between lines there is
	 * one small gap on both axes, a label is centred in its line on both axes.
	 */
	const expectGrid = () => {
		const items = options()
		const boxes = items.map((option) => option.getBoundingClientRect())
		const lefts = distinct(boxes.map((option) => option.left))
		const tops = distinct(boxes.map((option) => option.top))

		expect(lefts).toHaveLength(4)
		expect(tops).toHaveLength(3)
		expect(distinct(boxes.map((option) => option.width))).toHaveLength(1)
		expect(distinct(boxes.map((option) => option.height))).toHaveLength(1)

		const [{ width, height }] = boxes

		// Lines keep their own height: a tile isn't stretched
		expect(height).toBeLessThanOrEqual(width * 1.2)

		const gaps = [
			...steps(lefts).map((step) => step - width),
			...steps(tops).map((step) => step - height),
		]

		expect(distinct(gaps)).toHaveLength(1)
		expect(gaps[0]).toBeGreaterThan(0)
		expect(gaps[0]).toBeLessThan(Math.min(width, height) / 4)

		for (const option of items) {
			const cell = option.getBoundingClientRect()
			const { row, text } = rowOf(option)
			const label = labelBox(text)

			expectSameBox(row.getBoundingClientRect(), cell)
			expect(
				Math.abs(label.left + label.width / 2 - (cell.left + cell.width / 2)),
			).toBeLessThanOrEqual(1)
			expect(
				Math.abs(label.top + label.height / 2 - (cell.top + cell.height / 2)),
			).toBeLessThanOrEqual(1)
		}

		expect(box('.so-calendar__picker-header').bottom).toBeLessThanOrEqual(
			box('.so-calendar__picker-list').top + EPSILON,
		)
	}

	/** The card's padding, vertical and along the line alike — two margins. */
	const padding = () => parseFloat(getComputedStyle(find('.so-calendar__picker')).paddingTop)

	/**
	 * Open the panel with or without the gesture. The `picker` extension turns
	 * the gesture on at the place's popover; it is turned off by the same
	 * popover — from the `pickers` output of the engine given to the calendar.
	 */
	const openWith = async (props: Record<string, unknown>, swipe: TSwipe) => {
		const engine = createEngineCalendar()

		await show({ months: ['2026-09-01'], ...props, engine })

		for (const picker of engine.extensions.picker.pickers) picker.popover.swipe = swipe

		await open()
	}

	/**
	 * The backdrop is the panel itself over the whole calendar, and the choice
	 * is made in the card: it slides from the top like a drawer — from the
	 * calendar's top edge and across its full width. Only the bottom varies:
	 * the card is as high as its content — the header above the list, the
	 * padding or the gesture strip under it, — and the backdrop with the
	 * month's last weeks shows below.
	 */
	const expectCard = () => {
		const calendar = box('.so-calendar')
		const card = box('.so-calendar__picker')

		expectSameBox(box('.so-popover__panel'), calendar)
		expect(Math.abs(card.top - calendar.top)).toBeLessThanOrEqual(EPSILON)
		expect(Math.abs(card.left - calendar.left)).toBeLessThanOrEqual(EPSILON)
		expect(Math.abs(card.right - calendar.right)).toBeLessThanOrEqual(EPSILON)
		expect(calendar.bottom - card.bottom).toBeGreaterThan(box('.so-calendar__weekday').height)
		expect(box('.so-calendar__picker-header').bottom).toBeLessThanOrEqual(
			box('.so-calendar__picker-list').top + EPSILON,
		)
	}

	describe.each(COMPONENT_SIZES)('карточка, size %s', (size) => {
		it('с полосой жеста: полоса у низа карточки, во всю её ширину, список не накрывает', async () => {
			await openWith({ size }, 'handle')

			expectCard()

			const card = box('.so-calendar__picker')
			const list = box('.so-calendar__picker-list')
			const grip = box('.so-popover__handle')

			expect(grip.height).toBeGreaterThanOrEqual(GRIP_ZONE)
			expect(Math.abs(grip.bottom - card.bottom)).toBeLessThanOrEqual(EPSILON)
			expect(Math.abs(grip.left - card.left)).toBeLessThanOrEqual(EPSILON)
			expect(Math.abs(grip.width - card.width)).toBeLessThanOrEqual(EPSILON)
			expect(grip.top).toBeGreaterThanOrEqual(list.bottom - EPSILON)
		})

		it('без полосы: под списком — отступ карточки', async () => {
			await openWith({ size }, 'none')

			expectCard()

			const under =
				box('.so-calendar__picker').bottom - box('.so-calendar__picker-list').bottom

			expect(document.querySelector('.so-popover__handle')).toBeNull()
			expect(Math.abs(under - padding())).toBeLessThanOrEqual(EPSILON)
		})
	})

	/**
	 * The card is one for the whole calendar, however many grids it shows: the
	 * backdrop covers them all, the card spans the calendar's width at its top
	 * edge.
	 */
	it('три сетки — карточка во всю ширину календаря, у верхнего края', async () => {
		await show({ months: ['2026-08-01', '2026-09-01', '2026-10-01'] })
		await open()

		// The three months stand in a row — otherwise there's nothing to check
		expect(
			distinct(findAll('.so-calendar__month').map((month) => month.offsetTop)),
		).toHaveLength(1)
		expectCard()
	})

	/**
	 * An adapter may keep a `contained` panel in its own boxless nodes: React's
	 * `Teleport` on the client puts it in the place's node and a wrapper, both
	 * `display: contents`. The theme finds it as a descendant of the popover's
	 * root, not a direct child, and in the stand's React preview the backdrop
	 * and the card stand as in Vue. The framework's host draws the preview, as
	 * on the stand's page.
	 */
	it.each([
		['vue', true],
		['react', false],
	])(
		'превью стенда %s: подложка во весь календарь, карточка у верхнего края',
		async (framework, direct) => {
			const host = await loadHost(framework)
			const node = document.createElement('div')

			document.body.appendChild(node)

			const handle = host.mount(node, {
				component: 'calendar',
				props: { months: ['2026-09-01'] },
			})

			try {
				await nextFrame()
				await nextFrame()
				await open()

				// In Vue the panel is a direct child of the popover's root, in React
				// it is in wrappers
				expect(
					find('.so-popover__panel').parentElement === find('.so-calendar__heading'),
				).toBe(direct)
				expectCard()
			} finally {
				handle.unmount()
				node.remove()
			}
		},
	)

	/**
	 * The shadow and the rim ring are `box-shadow` layers. The backdrop has
	 * them removed — they stay as zero-size layers, — the card shows them: the
	 * card is of the overlay panels' family.
	 */
	it('кольцо и тень — у карточки, у подложки ни кромки, ни тени', async () => {
		await show({ months: ['2026-09-01'] })
		await open()

		const lengths = (selector: string) =>
			(style(find(selector)).boxShadow.match(/-?\d+(\.\d+)?px/g) ?? []).map(parseFloat)

		expect(lengths('.so-popover__panel').every((length) => length === 0)).toBe(true)
		expect(lengths('.so-calendar__picker').some((length) => length !== 0)).toBe(true)
		expect(outlined(find('.so-popover__panel'))).toBe(false)
		expect(outlined(find('.so-calendar__picker'))).toBe(false)
		expect(style(find('.so-calendar__picker-list')).borderTopWidth).toBe('0px')
	})

	it.each(['sm', 'normal', 'xl'] as const)(
		'size %s: месяцы — 4×3 ровными ячейками с зазором, подпись по центру, шапка над списком',
		async (size) => {
			await showIn('ru-RU', { months: ['2026-09-01'], size })
			await open()

			expectGrid()
		},
	)

	/** The label's words that broke across two lines. */
	const brokenWords = (text: HTMLElement): string[] =>
		[...text.childNodes].flatMap((node) =>
			node instanceof Text
				? [...node.data.matchAll(/\S+/g)].flatMap((match) => {
						const range = document.createRange()

						range.setStart(node, match.index)
						range.setEnd(node, match.index + match[0].length)

						const lines = distinct([...range.getClientRects()].map((rect) => rect.top))

						return lines.length > 1 ? [match[0]] : []
					})
				: [],
		)

	/**
	 * The label's visible part: text the area clips (`overflow` other than
	 * `visible`) shows only within its bounds.
	 */
	const visibleBox = (text: HTMLElement) => {
		const label = labelBox(text)

		if (getComputedStyle(text).overflowX === 'visible') return label

		const area = text.getBoundingClientRect()

		return { left: Math.max(label.left, area.left), right: Math.min(label.right, area.right) }
	}

	/**
	 * A year label wraps only between words — in `th-TH` it has the era
	 * («พ.ศ. 2569»), and an ellipsis would cut the number. At any size the
	 * words are whole, the label isn't clipped and stands in its tile.
	 */
	it.each(COMPONENT_SIZES)(
		'size %s: годы — так же ровной сеткой 4×3, подписи th-TH с эрой переносятся, а не режутся',
		async (size) => {
			await showIn('th-TH', { months: ['2026-09-01'], size })
			await open()

			const january = options()[0]?.textContent

			await userEvent.click(find('.so-calendar__picker-heading'))
			await expect.poll(() => options()[0]?.textContent).not.toBe(january)
			await nextFrame()

			expectGrid()

			for (const option of options()) {
				const { row, text } = rowOf(option)
				const cell = row.getBoundingClientRect()
				const label = labelBox(text)
				const name = text.textContent?.trim() ?? ''

				expect(brokenWords(text), name).toEqual([])
				expect(text.scrollWidth, name).toBeLessThanOrEqual(text.clientWidth)
				expect(label.left, name).toBeGreaterThanOrEqual(cell.left - EPSILON)
				expect(label.right, name).toBeLessThanOrEqual(cell.right + EPSILON)
			}
		},
	)

	/**
	 * A month name of several words wraps between words and isn't cut: in
	 * `vi-VN` it is «Tháng 10», wider than the tile at large sizes. An ellipsis
	 * would cut the number, and «Tháng 10»–«Tháng 12» would all read «Tháng …».
	 * At any size the label shows whole — nothing of it is clipped, — the words
	 * are whole, and it stands in its tile in width and height: two lines fit
	 * the tile.
	 */
	it.each(COMPONENT_SIZES)(
		'size %s: месяцы vi-VN в несколько слов переносятся между словами, а не режутся',
		async (size) => {
			await showIn('vi-VN', { months: ['2026-09-01'], size })
			await open()

			expectGrid()

			// The labels differ — they can be told apart if shown whole (below)
			const names = options().map((option) => rowOf(option).text.textContent?.trim())

			expect(new Set(names).size).toBe(12)

			for (const option of options()) {
				const { row, text } = rowOf(option)
				const cell = row.getBoundingClientRect()
				const area = text.getBoundingClientRect()
				const label = labelBox(text)
				const name = text.textContent?.trim() ?? ''

				expect(brokenWords(text), name).toEqual([])
				// Nothing is clipped: the label's lines are inside the text area,
				// and it clips everything past its edge
				expect(label.left, name).toBeGreaterThanOrEqual(area.left - EPSILON)
				expect(label.right, name).toBeLessThanOrEqual(area.right + EPSILON)
				expect(label.top, name).toBeGreaterThanOrEqual(area.top - EPSILON)
				expect(label.bottom, name).toBeLessThanOrEqual(area.bottom + EPSILON)
				// And in its tile
				expect(label.left, name).toBeGreaterThanOrEqual(cell.left - EPSILON)
				expect(label.right, name).toBeLessThanOrEqual(cell.right + EPSILON)
				expect(label.top, name).toBeGreaterThanOrEqual(cell.top - EPSILON)
				expect(label.bottom, name).toBeLessThanOrEqual(cell.bottom + EPSILON)
			}
		},
	)

	/**
	 * A word wider than the tile itself has nowhere to wrap — it is cut by an
	 * ellipsis, and only it: the label has no padding, and it doesn't let a
	 * word break. A name the tile fits stands whole and centred; one wider than
	 * the tile is cut at its edge, and the visible part stays in the tile. The
	 * longest words are in `ta-IN` («ஜூலை») and `ml-IN` («സെപ്റ്റം»,
	 * «ഫെബ്രു»); `ar-EG` is the same right to left. A pixel around the tile's
	 * width is left to rounding: there only the place is checked.
	 */
	describe.each(['ar-EG', 'ta-IN', 'ml-IN'])('месяцы %s', (locale) => {
		it.each(COMPONENT_SIZES)(
			'size %s: в своей плитке — целые по центру, шире плитки — многоточием',
			async (size) => {
				await showIn(locale, { months: ['2026-09-01'], size })
				await open()

				for (const option of options()) {
					const { row, text } = rowOf(option)
					const cell = row.getBoundingClientRect()
					const label = labelBox(text)
					const visible = visibleBox(text)
					const name = text.textContent?.trim() ?? ''

					expect(brokenWords(text), name).toEqual([])
					expect(visible.left, name).toBeGreaterThanOrEqual(cell.left - EPSILON)
					expect(visible.right, name).toBeLessThanOrEqual(cell.right + EPSILON)

					if (label.width < cell.width - 1) {
						expect(text.scrollWidth, name).toBeLessThanOrEqual(text.clientWidth)
						expect(
							Math.abs(label.left + label.width / 2 - (cell.left + cell.width / 2)),
							name,
						).toBeLessThanOrEqual(1)
					}

					if (label.width > cell.width + 1) {
						expect(getComputedStyle(text).textOverflow, name).toBe('ellipsis')
					}
				}
			},
		)
	})

	/**
	 * The weekday label is the short name if every short name of the locale's
	 * week has at most three letter-wide signs, otherwise the narrow one (the
	 * core rule, `weekdayLabelWidth`). The table holds both sides of the rule:
	 * short names of three signs — `ru-RU`, `fr-FR` («lun.»), `zh-CN`, `hi-IN`
	 * («मंगल»), — and longer ones: whole words in `ar-EG` and `ml-IN`, four or
	 * five signs in `ta-IN` and `te-IN` («ஞாயி.», «మంగళ»). Such short names are
	 * wider than the column: it would cut them in the middle of a letter, and
	 * their ends would peep out from under the card of the open picker.
	 *
	 * The rule runs on the browser's ICU, and a locale doesn't take the same side
	 * everywhere: `th-TH` has whole words for short names in Chromium
	 * («อาทิตย์») and gets narrow labels, while WebKit's ICU gives abbreviations
	 * with a dot («อา.»), and the short ones stay. So the spec doesn't tie a
	 * locale to a form: the whole week is one form of this browser — its `short`
	 * or `narrow` names, — and that both forms occur in the table is checked
	 * separately. A label stands in its column, and the card of the open picker
	 * covers it whole.
	 */
	const WEEKDAY_LOCALES = [
		'ru-RU',
		'fr-FR',
		'zh-CN',
		'hi-IN',
		'ar-EG',
		'ml-IN',
		'ta-IN',
		'te-IN',
		'th-TH',
	] as const

	type TWeekdayWidth = 'short' | 'narrow'

	/** The week of `locale` from Sunday, in names of `width` of this browser. */
	const weekNames = (locale: string, width: TWeekdayWidth): string[] => {
		const names = new Intl.DateTimeFormat(locale, { weekday: width, timeZone: 'UTC' })

		// 2026-09-20 is a Sunday
		return [0, 1, 2, 3, 4, 5, 6].map((day) => names.format(Date.UTC(2026, 8, 20 + day)))
	}

	/** The labels of the weekday columns, in order. */
	const weekLabels = () =>
		findAll('.so-calendar__weekday').map((weekday) => weekday.textContent?.trim())

	describe.each(WEEKDAY_LOCALES)('дни недели %s', (locale) => {
		it.each(COMPONENT_SIZES)(
			'size %s: неделя одной формы — в своих колонках, под открытой панелью — под карточкой',
			async (size) => {
				// From Sunday: columns from the locale's first day don't matter here
				await showIn(locale, { months: ['2026-09-01'], size, weekStart: 0 })

				const weekdays = findAll('.so-calendar__weekday')

				expect([weekNames(locale, 'short'), weekNames(locale, 'narrow')]).toContainEqual(
					weekLabels(),
				)

				for (const weekday of weekdays) {
					const column = weekday.getBoundingClientRect()
					const label = labelBox(weekday)
					const name = weekday.textContent?.trim() ?? ''

					expect(label.left, name).toBeGreaterThanOrEqual(column.left - EPSILON)
					expect(label.right, name).toBeLessThanOrEqual(column.right + EPSILON)
				}

				await open()

				const card = box('.so-calendar__picker')

				for (const weekday of weekdays) {
					const label = labelBox(weekday)
					const name = weekday.textContent?.trim() ?? ''

					expect(label.left, name).toBeGreaterThanOrEqual(card.left - EPSILON)
					expect(label.right, name).toBeLessThanOrEqual(card.right + EPSILON)
					expect(label.top, name).toBeGreaterThanOrEqual(card.top - EPSILON)
					expect(label.bottom, name).toBeLessThanOrEqual(card.bottom + EPSILON)
				}
			},
		)
	})

	/**
	 * Both forms occur in the table, whichever side each locale takes in this
	 * browser: with one form only, the check above would pass a rule that always
	 * picks it. A locale whose two lists coincide tells nothing and is not
	 * counted.
	 */
	it('дни недели: среди локалей таблицы — обе формы', async () => {
		const forms = new Set<TWeekdayWidth>()

		for (const locale of WEEKDAY_LOCALES) {
			await showIn(locale, { months: ['2026-09-01'], weekStart: 0 })

			const labels = weekLabels()
			const [form, other] = (['short', 'narrow'] as const).filter((width) => {
				const names = weekNames(locale, width)

				return (
					names.length === labels.length && names.every((name, i) => name === labels[i])
				)
			})

			if (form && !other) forms.add(form)

			cleanup()
		}

		expect([...forms].sort()).toEqual(['narrow', 'short'])
	})

	/**
	 * All by mouse: choosing a year rebuilds the list for months, and Vue
	 * redraws it between handlers of the same click — the click reaches the
	 * popover's root with a target no longer in the panel. The panel stays
	 * open.
	 */
	it('мышью: год — снова месяцы этого года, панель открыта; месяц — закрывает и ставит месяц', async () => {
		await show({ months: ['2026-09-01'] })
		await open()

		const tile = (label: string) => {
			const option = options().find((item) => item.textContent?.trim() === label)

			if (!option) throw new Error(`${label}: плитки нет`)

			return rowOf(option).row
		}

		await userEvent.click(find('.so-calendar__picker-heading'))
		await expect.poll(() => options()[0]?.textContent?.trim()).toBe('2017')

		await userEvent.click(tile('2024'))
		await expect.poll(() => options()[0]?.textContent?.trim()).toBe('Jan')
		await nextFrame()

		expect(find('.so-popover__panel').checkVisibility()).toBe(true)
		expect(find('.so-calendar__picker-heading').textContent?.trim()).toBe('2024')

		await userEvent.click(tile('Mar'))

		await expect.poll(titles).toEqual(['March 2024'])
		await expect.poll(() => find('.so-popover__panel').checkVisibility()).toBe(false)
	})

	it('указатель — рука на месяцах и годах, у выключенных вне границ — обычный', async () => {
		await show({ months: ['2026-09-01'], min: '2026-03-01', max: '2026-10-31' })
		await open()

		/** The cursor over the tile with the label. */
		const cursorOf = (label: string) => {
			const option = options().find((item) => item.textContent?.trim() === label)

			if (!option) throw new Error(`${label}: плитки нет`)

			return getComputedStyle(rowOf(option).row).cursor
		}

		expect(cursorOf('Mar')).toBe('pointer')
		expect(cursorOf('Oct')).toBe('pointer')
		expect(cursorOf('Feb')).not.toBe('pointer')
		expect(cursorOf('Nov')).not.toBe('pointer')

		await userEvent.click(find('.so-calendar__picker-heading'))
		await expect.poll(() => options()[0]?.textContent?.trim()).toBe('2017')

		expect(cursorOf('2026')).toBe('pointer')
		expect(cursorOf('2025')).not.toBe('pointer')
	})

	it('клавиатура: Enter на заголовке — фокус на список, ↓ и Enter выбирают, фокус — на заголовок', async () => {
		await show({ months: ['2026-09-01'], value: '2026-09-16' })

		find('.so-calendar__title').focus()
		await userEvent.keyboard('{Enter}')

		// The list is a ListBox: its Tab stop is the list node in the root
		await expect
			.poll(() => document.activeElement)
			.toBe(find('.so-calendar__picker-list > .so-list-box__list'))

		await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}')

		await expect.poll(titles).toEqual(['November 2026'])
		await expect.poll(() => document.activeElement).toBe(find('.so-calendar__title'))
	})

	it('Escape закрывает панель, фокус — на заголовок, месяц прежний', async () => {
		await show({ months: ['2026-09-01'] })
		await open()

		await userEvent.keyboard('{Escape}')

		await expect
			.poll(() => find('.so-calendar__title').getAttribute('aria-expanded'))
			.toBe('false')
		await expect.poll(() => document.activeElement).toBe(find('.so-calendar__title'))
		expect(titles()).toEqual(['September 2026'])
	})

	/** A point of the backdrop under the card — in the panel's coordinates. */
	const underCard = () => {
		const panel = box('.so-popover__panel')
		const card = box('.so-calendar__picker')

		return {
			x: card.left + card.width / 2 - panel.left,
			y: (card.bottom + panel.bottom) / 2 - panel.top,
		}
	}

	const expanded = () => find('.so-calendar__title').getAttribute('aria-expanded')

	/**
	 * The backdrop shows under the card: a press on it closes the panel, like
	 * Escape, — focus returns to the title and doesn't fall to the page.
	 */
	it('нажатие по подложке закрывает панель, фокус — на заголовок, месяц прежний', async () => {
		await show({ months: ['2026-09-01'] })
		await open()

		await userEvent.click(find('.so-popover__panel'), { position: underCard() })

		await expect.poll(expanded).toBe('false')
		await expect.poll(() => document.activeElement).toBe(find('.so-calendar__title'))
		expect(titles()).toEqual(['September 2026'])
	})

	/**
	 * Pressed in the card, released on the backdrop — the browser gives `click`
	 * to their common ancestor, the panel itself. That is no press on the
	 * backdrop: the panel stays open.
	 */
	it('протяжка из карточки на подложку панель не закрывает', async () => {
		await show({ months: ['2026-09-01'] })
		await open()

		const card = find('.so-calendar__picker')
		const { width } = card.getBoundingClientRect()

		await userEvent.dragAndDrop(card, find('.so-popover__panel'), {
			sourcePosition: { x: width / 2, y: 2 },
			targetPosition: underCard(),
		})
		await nextFrame()

		expect(expanded()).toBe('true')
	})

	/**
	 * The gesture is by the strip at the card's bottom, upward: the card slid
	 * in from the top and leaves the same way. The backdrop stays, and the card
	 * with the strip follows the pointer — had the backdrop moved along, it
	 * would stick out of the calendar. Released without a swipe, the card
	 * returns to its place.
	 */
	it('протяжка за полосу вверх тянет карточку, подложка стоит; отпущенная — на место', async () => {
		await show({ months: ['2026-09-01'] })
		await open()

		const panel = box('.so-popover__panel')
		const card = box('.so-calendar__picker')
		const grip = find('.so-popover__handle')
		const { width, height } = grip.getBoundingClientRect()

		await userEvent.hover(grip, { position: { x: width / 2, y: height / 2 } })
		await commands.mouseDown()

		try {
			await userEvent.hover(grip, {
				position: { x: width / 2, y: height / 2 - 30 },
				force: true,
			})
			await nextFrame()

			expect(Math.abs(box('.so-calendar__picker').top - card.top + 30)).toBeLessThanOrEqual(1)
			expectSameBox(box('.so-popover__panel'), panel)
		} finally {
			await commands.mouseUp()
		}

		await expect
			.poll(() => Math.abs(box('.so-calendar__picker').top - card.top) <= EPSILON)
			.toBe(true)
		expect(expanded()).toBe('true')
	})

	/** Drag the strip by `dy` vertically with the mouse — real events, in steps. */
	const dragGrip = (dy: number) => {
		const grip = find('.so-popover__handle')
		const { width, height } = grip.getBoundingClientRect()

		// `force`: the release point is outside the strip, and Playwright's hit
		// check would wait for the strip to get under it
		return userEvent.dragAndDrop(grip, grip, {
			sourcePosition: { x: width / 2, y: height / 2 },
			targetPosition: { x: width / 2, y: height / 2 + dy },
			steps: 10,
			force: true,
		})
	}

	/**
	 * A closed panel fades whole, the card together with the backdrop, and
	 * nothing moves: had the card slid away, its place would darken for a
	 * moment under the veil not yet faded, — the closing would read as a flash.
	 * A swiped card fades where it was released, not after returning to its
	 * place first. The panel goes once it has faded.
	 *
	 * `close` closes the panel. The card's place is `card`, and without it —
	 * where the first frame of leaving found it: a swiped one is closed by the
	 * release, and where that was shows only then. Returns that place.
	 */
	const expectFadingInPlace = async (
		close: () => Promise<unknown>,
		card: DOMRect | null = null,
	): Promise<DOMRect> => {
		const panel = find('.so-popover__panel')
		const backdrop = box('.so-popover__panel')
		const transitions = ownTransitions(panel)
		const opacities: number[] = []
		let place = card

		const seen = await whileLeaving(panel, close, () => {
			place ??= box('.so-calendar__picker')

			expectSameBox(box('.so-popover__panel'), backdrop)
			expectSameBox(box('.so-calendar__picker'), place)
			opacities.push(Number(style(panel).opacity))
		})

		expect(seen).toBeGreaterThan(1)
		expect(Math.min(...opacities)).toBeLessThan(1)

		for (let index = 1; index < opacities.length; index += 1) {
			expect(opacities[index]).toBeLessThanOrEqual(opacities[index - 1])
		}

		expectHidesWhenFaded(transitions)

		if (place === null) throw new Error('карточку на экране после закрытия не застали')

		return place
	}

	it('закрытая карточка гаснет на месте вместе с подложкой', async () => {
		await show({ months: ['2026-09-01'] })
		await open()

		await expectFadingInPlace(() => userEvent.keyboard('{Escape}'), box('.so-calendar__picker'))
	})

	it('смахнутая карточка гаснет там, где её отпустили, вместе с подложкой', async () => {
		await show({ months: ['2026-09-01'] })
		await open()

		const start = box('.so-calendar__picker').top
		const released = await expectFadingInPlace(() => dragGrip(-150))

		expect(released.top, 'отпустили выше, чем она стояла').toBeLessThan(start - EPSILON)
	})

	it('жест за полосу вверх закрывает панель, фокус — на заголовок; вниз — нет', async () => {
		await show({ months: ['2026-09-01'] })
		await open()

		const card = box('.so-calendar__picker')

		await dragGrip(150)
		await expect
			.poll(() => Math.abs(box('.so-calendar__picker').top - card.top) <= EPSILON)
			.toBe(true)

		expect(expanded()).toBe('true')

		await dragGrip(-150)

		await expect.poll(expanded).toBe('false')
		await expect.poll(() => document.activeElement).toBe(find('.so-calendar__title'))
	})

	/**
	 * A disabled button loses focus, and it would fall to the page. The plugin
	 * moves it to the list of the same panel.
	 */
	it('стрелка погасла у границы лет под фокусом — фокус на список панели', async () => {
		await show({ months: ['2026-09-01'], max: '2027-10-31' })
		await open()

		find('.so-calendar__picker-next').focus()
		await userEvent.keyboard('{Enter}')

		await expect
			.poll(() => find('.so-calendar__picker-heading').textContent?.trim())
			.toBe('2027')
		expect(find('.so-calendar__picker-next').hasAttribute('disabled')).toBe(true)
		expect(document.activeElement).toBe(find('.so-calendar__picker-list > .so-list-box__list'))
	})

	/**
	 * Forced colors mode (Windows high contrast): the browser replaces
	 * backgrounds with the surface colour and drops shadows. The selected tile —
	 * a ListBox line without a check mark, its selection shown only by the
	 * background — is painted with the system highlight; the strip's stroke —
	 * a pseudo-element's background — with the system text colour; the card's
	 * rim becomes a frame, and there is no frame around the backdrop.
	 */
	describe('принудительные цвета', () => {
		afterEach(async () => {
			await forcedColors('none')
		})

		it('выбранная плитка — системной подсветкой, штрих полосы виден', async () => {
			await forcedColors('active')
			await show({ months: ['2026-09-01'] })
			await open()

			const tile = style(
				find(
					'.so-calendar__picker-list .so-list-box-item[data-selected="true"] > .so-button',
				),
			)
			const grip = style(find('.so-popover__handle'), '::before')

			expect(matchMedia('(forced-colors: active)').matches).toBe(true)
			expect(pixel([tile.backgroundColor])).toEqual(pixel([systemColor('Highlight')]))
			expect(pixel([tile.color])).toEqual(pixel([systemColor('HighlightText')]))
			expect(pixel([grip.backgroundColor])).toEqual(pixel([systemColor('CanvasText')]))
			expect(pixel([grip.backgroundColor])).not.toEqual(
				pixel([style(find('.so-calendar__picker')).backgroundColor]),
			)
		})

		it.runIf(forcedColorsRepaint)('рамка — у карточки, а не вокруг подложки', async () => {
			await forcedColors('active')
			await show({ months: ['2026-09-01'] })
			await open()

			expect(outlined(find('.so-calendar__picker'))).toBe(true)
			expect(outlined(find('.so-popover__panel'))).toBe(false)
		})
	})
})
