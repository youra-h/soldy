/**
 * The Angular host on the stand's page in a real browser.
 *
 * jsdom checks the host whole, but there the Angular packages go through Vite's
 * transform (`server.deps.inline`), and in the browser through its dependency
 * pre-bundling. The linker stands there too (`src/vite-angular.ts`): without it
 * the Angular page would fail on the very first import of an Angular package,
 * asking for the compiler at runtime.
 *
 * Here is also the layout jsdom doesn't compute. The host's root
 * (`pg-angular-root`) takes no part in the layout (`display: contents`), and a
 * component stands in its cell as the Vue host's component does — the same
 * place and size. A preview with a wrapper and content has the wrapper and the
 * parts standing the same too: the label around the checkbox, the slider and
 * the rating, thumbs and stars, collection items, tags, the Select field with
 * its wrappers and arrow, the pagination pages, the active tab's panel, the
 * date field's parts and separators, the calendar's heading, paging buttons,
 * weekday labels and days, the DatePicker field with its calendar button, — and
 * for the table its window, root, headers and rows: the layout plugin measures
 * the columns' place by the window, and the layout matches only if it found the
 * window; for the Virtual window — its row: a list, Select and a table.
 *
 * The popover's and the tooltip's panels and Select's list are carried to
 * `body`, past the cell, and stand at their anchor — the root Angular gives the
 * panel as a value (the base's `rootElement()`). An open panel with its parts is
 * checked against Vue from the trigger's corner, and Select's list with options
 * from the corner of Select's root (`panel-boxes.ts`, as for Web Components):
 * the previews of both hosts go in one block, in turn. The dialog and the drawer
 * are in `body` too, with a companion backdrop before them, and stand at an edge
 * or in the middle of the window: in the cell a button stays of them, and open,
 * with the backdrop and parts, they are checked against Vue from the window's
 * corner. The toasts region is in `body` too: in the cell a row of buttons stays
 * of the boxless manager, and the region with the toast a button showed is
 * checked against Vue from the window's corner. The DatePicker panel with the
 * calendar is in `body`, at the root, and is checked from its corner, like
 * Select's list, while the month and year picker stays in the calendar
 * (`contained`) and is checked from the corner of the month's heading.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { useIcons, useTheme } from '@soldy-ui/setup'
import * as material from '@soldy-ui/icons-material'
import { loadHost } from '../src/hosts'
import { router } from '../src/router'
import { renderStand } from './stand'
import {
	BOX,
	DIALOG_PARTS,
	DRAWER_PARTS,
	POPOVER_PARTS,
	TOOLTIP_PARTS,
	measure,
	measureLayer,
	type TBox,
} from './panel-boxes'

import '@soldy-ui/theme-oren'
import oren from '@soldy-ui/theme-oren/setup'
import '../src/styles.css'

useIcons(material)
useTheme(oren)

const settle = () => new Promise((resolve) => setTimeout(resolve, 300))

/** How many frames in a row the stage's boxes stay the same to count as settled. */
const STILL = 10

/** The page's row by the prop's name. */
const propRow = (name: string): HTMLElement => {
	const found = [...document.querySelectorAll('.pg-prop')].find(
		(node) => node.querySelector('.pg-prop__name')?.textContent?.trim() === name,
	)

	if (!(found instanceof HTMLElement)) throw new Error(`строки «${name}» нет`)

	return found
}

/**
 * The boxes of the component and its drawn parts in the row's first column —
 * from the corner of the column's scene, in document order: they show both
 * each part's place in the cell and its size. A hidden part has no boxes and
 * doesn't count: Angular keeps an inactive tab's panel in the markup hidden —
 * it is the consumer's element, — and Vue doesn't draw it.
 */
function stageBoxesOf(framework: string, component: string, selector: string, row: string) {
	const stage = propRow(row).querySelector('.pg-col__stage')
	const parts = [...(stage?.querySelectorAll(selector) ?? [])].filter(
		(part) => part.getClientRects().length > 0,
	)

	if (!stage || parts.length === 0) {
		throw new Error(`${framework}/${component}: в сцене нет ${selector}`)
	}

	const outer = stage.getBoundingClientRect()

	return parts.map((part) => {
		const inner = part.getBoundingClientRect()

		return {
			x: Math.round(inner.left - outer.left),
			y: Math.round(inner.top - outer.top),
			width: Math.round(inner.width),
			height: Math.round(inner.height),
		}
	})
}

/**
 * The stage's boxes once it has settled: the same boxes for `STILL` frames in a
 * row. The page mounts dozens of previews at once, and under load a fixed pause
 * ended before the plugins had measured: a table still stood in the widths the
 * theme gives it before the core's layout, and a `Virtual` window still showed
 * its first batch of rows. A layout plugin finishes within a few frames once
 * frames run, so a stage unchanged for `STILL` of them has settled.
 */
async function boxesOf(framework: string, component: string, selector: string, row = 'visible') {
	await router.push(`/${framework}/${component}`)
	await settle()

	let previous = ''
	let still = 0

	for (let frame = 0; frame < 300; frame += 1) {
		await nextFrame()

		const boxes = stageBoxesOf(framework, component, selector, row)
		const current = JSON.stringify(boxes)

		still = current === previous ? still + 1 : 0
		previous = current

		if (still === STILL) return boxes
	}

	throw new Error(`${framework}/${component}: сцена не встала за 300 кадров`)
}

describe('хост Angular', () => {
	beforeEach(async () => {
		document.documentElement.dataset.soTheme = 'oren'

		await router.push('/vue')

		renderStand()

		await settle()
	})

	// The selector is the component and its parts: the wrapper, collection items, panels
	it.for([
		['button', '.so-button'],
		['icon', '.so-icon'],
		['skeleton', '.so-skeleton'],
		['input', '.so-input'],
		// The field's box and its parts: the input, the row of step buttons, the buttons and their icons
		[
			'number-input',
			'.so-number-input, .so-number-input__input, .so-number-input__stepper, .so-number-input__decrement, .so-number-input__increment, .so-number-input svg',
		],
		// The root and the field inside: the root is `<div so-textarea>`, as the `div`
		// of Vue, and the theme makes it the frame
		['textarea', '.so-textarea, .so-textarea textarea'],
		['check-box', '.so-label, .so-check-box'],
		['switch', '.so-label, .so-switch'],
		// The slider and the rating in a label on top: the track, the fill, the thumb
		// with its field; the stars and their icons
		[
			'slider',
			'.so-label, .so-slider, .so-slider__track, .so-slider__range, .so-slider__thumb, .so-slider__input',
		],
		['rating', '.so-label, .so-rating, .so-rating__star, .so-rating__icon, .so-rating__thumb'],
		['label', '.so-label, .so-check-box'],
		['field', '.so-field, .so-field__label, .so-field__control, .so-input, .so-field__helper'],
		['radio-group', '.so-radio-group, .so-radio-group-item'],
		['list-box', '.so-list-box, .so-list-box-item'],
		['tags', '.so-tags, .so-tags-item, .so-tags-item .so-button__text'],
		// Select's field with the wrappers at its sides and the arrow: the list is carried to `body`
		[
			'select',
			'.so-select, .so-select__field, .so-input__leading, .so-select__field input, .so-input__trailing, .so-select__arrow, .so-select__arrow svg',
		],
		['tabs', '.so-tabs, .so-tabs-item, .so-tabs__panel'],
		['accordion', '.so-accordion, .so-accordion-item'],
		// Arrows, pages and gaps — in one line
		[
			'pagination',
			'.so-pagination, .so-pagination__prev, .so-pagination-item, .so-pagination__ellipsis, .so-pagination__next',
		],
		// The scroller and the bar take the frame's full width: buttons, the viewport
		// and its content; the track and the fill of the fraction
		[
			'scroller',
			'.so-scroller, .so-scroller__prev, .so-scroller__viewport, .so-scroller__viewport > *, .so-scroller__next',
		],
		['progress-linear', '.so-progress-linear, .so-progress-linear__range'],
		// The table — the window, the root, the headers and the rows: the host sets the preview's frame
		['table', '.so-table__viewport, .so-table, .so-table-column, .so-table-row'],
		// The date field — the parts and separators in a row; the calendar — the
		// heading, paging buttons with icons, the grid, weekday labels, days and fillers
		[
			'date-input',
			'.so-date-input, .so-date-input__segments, .so-date-input__segment, .so-date-input__literal',
		],
		[
			'calendar',
			'.so-calendar, .so-calendar__month, .so-calendar__heading, .so-calendar__title, .so-calendar__prev, .so-calendar__next, .so-calendar svg, .so-calendar__grid, .so-calendar__weekday, .so-calendar-item, .so-calendar__filler',
		],
		// The DatePicker panel is carried to `body`: in the cell — the field with the calendar button
		[
			'date-picker',
			'.so-date-picker, .so-date-picker__field, .so-date-input__segment, .so-date-input__literal, .so-date-input__trailing, .so-date-picker__trigger, .so-date-picker__trigger svg',
		],
		// The root and the trigger in it: there is no panel in the cell — it is carried to `body`
		['popover', '.so-popover, .so-popover > .so-button'],
		['tooltip', '.so-tooltip, .so-tooltip > .so-button'],
		['menu', '.so-menu, .so-menu > .so-button'],
		// The button that opens the dialog and the drawer: they are carried to `body`.
		// The toasts have a row of buttons that show them: the manager has no box, and
		// the region is carried away
		['dialog', '.so-button'],
		['drawer', '.so-button'],
		['toasts', '.so-button'],
	])('%s стоит в ячейке так же, как у Vue', async ([component, selector]) => {
		const vue = await boxesOf('vue', component, selector)
		const angular = await boxesOf('angular', component, selector)

		expect(angular[0].width).toBeGreaterThan(0)
		expect(angular).toEqual(vue)
	})

	/**
	 * The window's row: a list with a row limit, Select in a column of its own
	 * width and a table in a wrapper. The window has no `visible` row — it has no
	 * view, — and the scene is taken from the row of its switch.
	 */
	it('virtual: ряд окна стоит в ячейке так же, как у Vue', async () => {
		const selector =
			'.so-list-box, .so-list-box-item, .so-select, .so-select__field, .so-table__viewport, .so-table, .so-table-row'
		const vue = await boxesOf('vue', 'virtual', selector, 'enabled')
		const angular = await boxesOf('angular', 'virtual', selector, 'enabled')

		expect(angular.length).toBeGreaterThan(3)
		expect(angular[0].width).toBeGreaterThan(0)
		expect(angular).toEqual(vue)
	})
})

/**
 * A host's preview in a block — open: the boxes of the trigger and the panel
 * with its parts from the trigger's corner. Measured and removed — it doesn't
 * get in the next render's way. There is no stand page here: its previews are
 * panels in `body` too, and the measure would wait forever for the showcase's
 * endless animations.
 */
async function panelOf(
	framework: string,
	component: string,
	props: Readonly<Record<string, unknown>>,
	parts: string,
): Promise<TBox[]> {
	const host = await loadHost(framework)
	const node = document.createElement('div')

	node.style.cssText = BOX
	document.body.appendChild(node)

	const handle = host.mount(node, { component, props })

	try {
		return await measure(() => node.querySelector(`.so-${component} > .so-button`), parts)
	} finally {
		handle.unmount()
		node.remove()
	}
}

describe('хост Angular · панель у триггера', () => {
	beforeEach(() => {
		document.documentElement.dataset.soTheme = 'oren'
	})

	// The parts: for the popover — the panel, the content wrapper, a paragraph and
	// a button in it, the cross and its icon; for the tooltip — the panel and the
	// text wrapper
	it.each([
		['popover', { open: true, aria_label: 'Пример поповера' }, POPOVER_PARTS, 7],
		['tooltip', { open: true }, TOOLTIP_PARTS, 3],
	])(
		'%s: открытая панель с частями стоит у триггера так же, как у Vue',
		async (component, props, parts, count) => {
			const vue = await panelOf('vue', component, props, parts)
			const angular = await panelOf('angular', component, props, parts)

			expect(angular).toHaveLength(count)
			expect(angular[1].height).toBeGreaterThan(0)
			expect(angular).toEqual(vue)
		},
	)
})

/** The parts of Select's open list: the panel, the list and the options with their rows. */
const SELECT_PARTS =
	'.so-select__panel, .so-select__list, .so-select-item, .so-select-item > .so-button'

/**
 * A host's Select preview in a block — open (`open`): the boxes of the root and
 * the list with options from the root's corner — the panel's anchor. Measured
 * and removed — it doesn't get in the next render's way.
 */
async function selectOf(framework: string): Promise<TBox[]> {
	const host = await loadHost(framework)
	const node = document.createElement('div')

	node.style.cssText = BOX
	document.body.appendChild(node)

	const handle = host.mount(node, { component: 'select', props: { open: true } })

	try {
		return await measure(() => node.querySelector('.so-select'), SELECT_PARTS)
	} finally {
		handle.unmount()
		node.remove()
	}
}

describe('хост Angular · список Select', () => {
	beforeEach(() => {
		document.documentElement.dataset.soTheme = 'oren'
	})

	it('открытый список с опциями стоит у поля так же, как у Vue', async () => {
		const vue = await selectOf('vue')
		const angular = await selectOf('angular')

		// The root, the panel, the list and five options with their rows
		expect(angular).toHaveLength(13)
		expect(angular[1].height).toBeGreaterThan(0)
		expect(angular).toEqual(vue)
	})
})

/**
 * The parts of the open month and year picker: the place's popover panel, the
 * card, the list of 12 months and the header with the year and arrows.
 */
const PICKER_PARTS =
	'.so-calendar .so-popover__panel, .so-calendar__picker, .so-calendar__picker-list, .so-calendar__picker .so-list-box-item, .so-calendar__picker-header, .so-calendar__picker-heading, .so-calendar__picker-prev, .so-calendar__picker-next'

/**
 * The parts of DatePicker's open panel: the panel, the content, the calendar,
 * the month, the heading with its button, the paging buttons, the grid and the
 * weekday labels — without the days: their number depends on the month.
 */
const DATE_PICKER_PARTS =
	'.so-date-picker__panel, .so-date-picker__content, .so-date-picker__calendar, .so-date-picker__panel .so-calendar__month, .so-date-picker__panel .so-calendar__heading, .so-date-picker__panel .so-calendar__title, .so-date-picker__panel .so-calendar__prev, .so-date-picker__panel .so-calendar__next, .so-date-picker__panel .so-calendar__grid, .so-date-picker__panel .so-calendar__weekday'

/** A frame: the plugins get the root a frame after the render. */
const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/**
 * A host's date preview in a block — open: the boxes of the anchor and the
 * panel with its parts from the anchor's corner. DatePicker's panel is opened by
 * the prop (`open`) and carried to `body`, the anchor is the root, as for
 * Select; the calendar's picker is opened by a press on the month's heading — a
 * frame later, once the plugins got the root, — and it stays in the calendar
 * (`contained`) and is checked from the heading's corner. Measured and removed —
 * it doesn't get in the next render's way.
 */
async function datesOf(
	framework: string,
	component: string,
	props: Readonly<Record<string, unknown>>,
	anchor: string,
	parts: string,
): Promise<TBox[]> {
	const host = await loadHost(framework)
	const node = document.createElement('div')

	node.style.cssText = BOX
	document.body.appendChild(node)

	const handle = host.mount(node, { component, props })
	const target = () => node.querySelector(anchor)

	try {
		if (component === 'calendar') {
			await nextFrame()
			await nextFrame()

			const title = target()

			if (!(title instanceof HTMLElement)) throw new Error(`${framework}: заголовка нет`)

			title.click()
		}

		return await measure(target, parts)
	} finally {
		handle.unmount()
		node.remove()
	}
}

describe('хост Angular · панели дат', () => {
	beforeEach(() => {
		document.documentElement.dataset.soTheme = 'oren'
	})

	// The number of parts with the anchor: for the calendar — the heading and 19
	// parts of the picker, for DatePicker — the root and 16 parts of the panel. The
	// number keeps a panel that didn't open from matching itself
	it.each([
		['calendar', {}, '.so-calendar__title', PICKER_PARTS, 20],
		['date-picker', { open: true }, '.so-date-picker', DATE_PICKER_PARTS, 17],
	])(
		'%s: открытая панель с частями стоит у якоря так же, как у Vue',
		async (component, props, anchor, parts, count) => {
			const vue = await datesOf('vue', component, props, anchor, parts)
			const angular = await datesOf('angular', component, props, anchor, parts)

			expect(angular).toHaveLength(count)
			expect(angular[1].width).toBeGreaterThan(0)
			expect(angular).toEqual(vue)
		},
	)
})

/** The parts of a menu panel — groups with a label, separators, items with their rows and columns. */
const MENU_PARTS = [
	'.so-menu__list',
	'.so-menu-group',
	'.so-menu-group__label',
	'.so-menu-separator',
	'.so-menu-item',
	'.so-menu-item > .so-button',
	'.so-menu-item__indicator',
	'.so-menu-item__icon',
	'.so-menu-item__shortcut',
	'.so-menu-item__arrow',
]

/** The selector of the anchor's panel and its parts — by its `id` the anchor refers to. */
function menuPartsOf(anchor: Element | null): string {
	const panel = `#${CSS.escape(anchor?.getAttribute('aria-controls') ?? '')}`

	return [panel, ...MENU_PARTS.map((part) => `${panel} ${part}`)].join(', ')
}

/**
 * A host's menu preview in a block — open (`open`): the boxes of the menu panel
 * with its parts from the trigger's corner, and with `submenu` also the
 * «Поделиться» submenu opened by a click on its row, from the row's corner. Two
 * panels are on screen then, and each one's parts are found by its `id`.
 * Measured and removed — it doesn't get in the next render's way.
 *
 * The row is clicked once the menu has taken focus into its panel: an open
 * menu does that a frame after its root is declared (`TOverlayFocusPlugin`),
 * and focus coming to the menu's panel is focus leaving a submenu opened before
 * it — the submenu closes (`TDismissPlugin` with `focusOutside`). The boxes
 * settle without waiting for that frame, and under load the click came before
 * it. The submenu is measured once it is open.
 */
async function menuOf(framework: string, submenu: boolean): Promise<TBox[]> {
	const host = await loadHost(framework)
	const node = document.createElement('div')

	node.style.cssText = BOX
	document.body.appendChild(node)

	const handle = host.mount(node, { component: 'menu', props: { open: true } })
	const trigger = () => node.querySelector('.so-menu > .so-button')

	try {
		if (!submenu) return await measure(trigger, menuPartsOf(trigger()))

		const panel = `#${CSS.escape(trigger()?.getAttribute('aria-controls') ?? '')}`
		const row = () => document.querySelector(`${panel} .so-menu-item > [aria-haspopup="menu"]`)

		await measure(trigger, menuPartsOf(trigger()))
		await expect
			.poll(() => document.querySelector(panel)?.contains(document.activeElement), {
				message: `${framework}: фокус в панели меню`,
			})
			.toBe(true)

		const share = row()

		if (!(share instanceof HTMLElement)) throw new Error(`${framework}: строки подменю нет`)

		share.click()

		await expect
			.poll(() => row()?.getAttribute('aria-expanded'), {
				message: `${framework}: подменю открыто`,
			})
			.toBe('true')

		return await measure(row, menuPartsOf(row()))
	} finally {
		handle.unmount()
		node.remove()
	}
}

describe('хост Angular · панели меню и подменю', () => {
	beforeEach(() => {
		document.documentElement.dataset.soTheme = 'oren'
	})

	it('открытая панель меню и её части стоят у триггера так же, как у Vue', async () => {
		const vue = await menuOf('vue', false)
		const angular = await menuOf('angular', false)

		// The trigger, the panel, the list, groups with labels, separators, ten items
		// with their rows and parts
		expect(angular.length).toBeGreaterThan(20)
		expect(angular[1].height).toBeGreaterThan(0)
		expect(angular).toEqual(vue)
	})

	it('открытая панель подменю и её пункты стоят у его строки так же, как у Vue', async () => {
		const vue = await menuOf('vue', true)
		const angular = await menuOf('angular', true)

		// The row, the submenu panel, the list, three items with their rows, the submenu arrow
		expect(angular.length).toBeGreaterThan(5)
		expect(angular[1].width).toBeGreaterThan(0)
		expect(angular).toEqual(vue)
	})
})

/**
 * A host's preview in a block — open (`visible`): the boxes of the layer with
 * its backdrop and parts from the window's corner. Measured and removed — it
 * doesn't get in the next render's way, and the removed dialog releases the
 * scroll lock.
 */
async function layerOf(framework: string, component: string, parts: string): Promise<TBox[]> {
	const host = await loadHost(framework)
	const node = document.createElement('div')

	node.style.cssText = BOX
	document.body.appendChild(node)

	const handle = host.mount(node, { component, props: { visible: true } })

	try {
		return await measureLayer(parts)
	} finally {
		handle.unmount()
		node.remove()
	}
}

describe('хост Angular · окно и выезжающая панель', () => {
	beforeEach(() => {
		document.documentElement.dataset.soTheme = 'oren'
	})

	// The parts: the backdrop, the dialog or the panel, the title, the body, a
	// paragraph and a field in it, the footer, two buttons in it, the cross
	it.each([
		['dialog', DIALOG_PARTS],
		['drawer', DRAWER_PARTS],
	])('%s: открытый с подложкой и частями стоит так же, как у Vue', async (component, parts) => {
		const vue = await layerOf('vue', component, parts)
		const angular = await layerOf('angular', component, parts)

		expect(angular).toHaveLength(10)
		expect(angular[1].width).toBeGreaterThan(0)
		expect(angular).toEqual(vue)
	})
})

/**
 * The parts of the region with a toast: the region, the toast, the card, the
 * icon box, the text, the «Отменить» button of its own content and the cross.
 * The button is a descendant of the part, not its child: in Angular the own
 * content is a component with its own boxless element, and the button lies in
 * it.
 */
const TOASTS_PARTS =
	'.so-toasts:has(.so-toasts-item), .so-toasts-item, .so-toasts-item__card, .so-toasts-item__icon, .so-toasts-item__text, .so-toasts-item__content .so-button, .so-toasts-item__close'

/**
 * A host's toasts preview in a block: the «обычное» button shows a toast — with
 * an «Отменить» button, — and the boxes of the region with its parts are taken
 * from the window's corner once the toast has settled. Measured and removed —
 * the removed preview takes the region with it.
 */
async function toastOf(framework: string): Promise<TBox[]> {
	const host = await loadHost(framework)
	const node = document.createElement('div')

	node.style.cssText = BOX
	document.body.appendChild(node)

	const handle = host.mount(node, { component: 'toasts', props: {} })

	try {
		const button = [...node.querySelectorAll('.so-button')].find(
			(candidate) => candidate.textContent?.trim() === 'обычное',
		)

		if (!(button instanceof HTMLElement)) throw new Error(`${framework}: кнопки «обычное» нет`)

		button.click()

		return await measureLayer(TOASTS_PARTS)
	} finally {
		handle.unmount()
		node.remove()
	}
}

describe('хост Angular · регион тостов', () => {
	beforeEach(() => {
		document.documentElement.dataset.soTheme = 'oren'
	})

	it('регион с тостом стоит у края окна так же, как у Vue', async () => {
		const vue = await toastOf('vue')
		const angular = await toastOf('angular')

		expect(angular).toHaveLength(7)
		expect(angular[0].width).toBeGreaterThan(0)
		expect(angular).toEqual(vue)
	})
})
