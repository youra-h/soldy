/**
 * Calendar template: months in a row by a loop over grid places, one pair of paging buttons
 * at the first month, the footer in a row of its own. No handlers: clicks and keys are
 * caught by plugins on the root. docs/architecture.md, Layer 8d, «Даты».
 */

import type {
	ICalendar,
	ICalendarItem,
	IPopover,
	TCalendarCell,
	TCalendarCollectionFacade,
	TCalendarGrid,
	TCalendarPicker,
	TCalendarPickerList,
	TCalendarWeekday,
} from '@soldy-ui/core'
import { DEFAULT_SLOT } from '@soldy-ui/setup'
import {
	TKeyedLoop,
	bind,
	createDetail,
	createItem,
	lend,
	lendSamples,
	ownerAttributes,
	type ITemplate,
	type ITemplateContext,
	type TItemSlots,
	patch,
} from '../../adapter'
import {
	iconButton,
	syncIconButton,
	type TIconButton,
	type TIconButtonSpec,
} from '../common/icon-button'
import { TButtonElement, type TButtonElementProps } from '../button'
import { TListBoxElement, type TListBoxElementProps } from '../list-box'
import { registerPopoverTag, type TPopoverElementProps } from '../popover'
import { TCalendarItemElement } from './item'

/** Calendar sample → day slot (`setup/__tests__/item-slots.spec.ts`). */
export const CALENDAR_ITEM_SLOTS: TItemSlots = {
	item: 'default',
}

/** Month heading — Popover on a `div`: the panel lies in the root, and a block has no place in a `span`. */
const TPopoverDivElement = registerPopoverTag('div')

type TCalendarContext = ITemplateContext<ICalendar, TCalendarCollectionFacade>

/** `arrowRight` for both arrows: the theme mirrors «back». */
const PREV: TIconButtonSpec = {
	embedded: 'calendar.prev',
	iconEmbedded: 'calendar.prev-icon',
	className: 'so-calendar__prev',
	role: 'arrowRight',
}

const NEXT: TIconButtonSpec = {
	embedded: 'calendar.next',
	iconEmbedded: 'calendar.next-icon',
	className: 'so-calendar__next',
	role: 'arrowRight',
}

const PICKER_PREV: TIconButtonSpec = {
	embedded: 'calendar.picker-prev',
	iconEmbedded: 'calendar.picker-prev-icon',
	className: 'so-calendar__picker-prev',
	role: 'arrowRight',
}

const PICKER_NEXT: TIconButtonSpec = {
	embedded: 'calendar.picker-next',
	iconEmbedded: 'calendar.picker-next-icon',
	className: 'so-calendar__picker-next',
	role: 'arrowRight',
}

type THeading = {
	readonly popover: TPopoverElementProps<HTMLDivElement>
	readonly instance: IPopover
	readonly title: TButtonElementProps
	readonly titleText: HTMLElement
	readonly card: HTMLElement
	readonly header: HTMLElement
	/** The list detail — once the place has its list: from the first opening of the popover. */
	list: TListBoxElementProps | null
	readonly heading: TButtonElementProps
	readonly prev: TIconButton
	readonly next: TIconButton
}

/** A week is keyed by its place: a new first day of the week keeps six days of seven in their row. */
type TWeek = { readonly cells: TCalendarCell[]; readonly place: number }

type TMonth = {
	readonly node: HTMLElement
	/** The heading — while the place has a picker panel. */
	heading: THeading | null
	readonly table: HTMLTableElement
	readonly weekdays: HTMLTableRowElement
	readonly weeks: TKeyedLoop<TWeek, number, HTMLTableRowElement>
}

/**
 * A month is keyed by place, not by month: when paging, the heading button, its popover and
 * the live region stay the same nodes — focus does not drop from the panel, the change is announced.
 */
type TPlace = {
	readonly index: number
	readonly grid: TCalendarGrid
}

type TCellKey = ICalendarItem | string

type TCalendarParts = {
	readonly prev: TIconButton
	readonly next: TIconButton
	readonly months: TKeyedLoop<TPlace, number, HTMLElement>
}

const parts = new WeakMap<HTMLElement, TCalendarParts>()

const monthsByNode = new WeakMap<HTMLElement, TMonth>()

const cellLoops = new WeakMap<
	HTMLTableRowElement,
	TKeyedLoop<TCalendarCell, TCellKey, HTMLElement>
>()

/**
 * The place's popover — before insertion: the assembly takes it on connection. The list
 * comes later, with the place's list (`listDetailOf`).
 */
function headingOf(owner: Document, picker: TCalendarPicker): THeading {
	const popover = createDetail(owner, TPopoverDivElement, { embedded: 'calendar.picker' })
	const title = createDetail(owner, TButtonElement, {
		embedded: 'calendar.title',
		attributes: { type: 'button' },
	})
	const titleText = owner.createElement('span')
	const card = owner.createElement('div')
	const header = owner.createElement('div')
	const heading = createDetail(owner, TButtonElement, {
		embedded: 'calendar.picker-heading',
		attributes: { type: 'button' },
	})
	const prev = iconButton(owner, PICKER_PREV, false)
	const next = iconButton(owner, PICKER_NEXT, false)

	popover.className = 'so-calendar__heading'
	popover.ctrl = picker.popover
	popover.contained = true
	popover.edge = 'top'
	title.className = 'so-calendar__title'
	titleText.className = 'so-calendar__title-text'
	card.className = 'so-calendar__picker'
	header.className = 'so-calendar__picker-header'
	heading.className = 'so-calendar__picker-heading'

	// The parts go into the details before the popover: they enter the document in one
	// insertion and are assembled once
	lend(title, DEFAULT_SLOT, titleText)
	header.append(heading, prev.button, next.button)
	card.append(header)
	lend(popover, 'trigger', title)
	lend(popover, DEFAULT_SLOT, card)

	return {
		popover,
		instance: picker.popover,
		title,
		titleText,
		card,
		header,
		list: null,
		heading,
		prev,
		next,
	}
}

/**
 * The list detail over the place's list and its engine — the place gets them with the first
 * opening of its popover. The detail takes them before insertion: the assembly takes them on
 * connection.
 */
function listDetailOf(owner: Document, list: TCalendarPickerList): TListBoxElementProps {
	const detail = createDetail(owner, TListBoxElement, { embedded: 'calendar.picker-list' })

	detail.className = 'so-calendar__picker-list'
	detail.ctrl = list.ctrl
	detail.engine = list.engine
	detail.indicator = 'none'

	return detail
}

function syncHeading(
	ctx: TCalendarContext,
	heading: THeading,
	grid: TCalendarGrid,
	picker: TCalendarPicker,
): void {
	const { size } = ctx.state
	const disabled = ctx.state.disabled === true
	const { popover, title, titleText } = heading
	const list =
		heading.list ?? (picker.list ? listDetailOf(ctx.root.ownerDocument, picker.list) : null)

	patch(title, { size, disabled })

	// The live region is text, not a control
	ownerAttributes(titleText, grid.titleAria)

	patch(titleText, { textContent: grid.title })
	patch(popover, { aria_labelledBy: picker.labelledBy })

	if (list) patch(list, { size, aria_labelledBy: picker.labelledBy })

	// A new list goes in with its props, before the header: focus on opening lands on it
	if (list && !heading.list) {
		heading.card.insertBefore(list, heading.header)
		heading.list = list
	}

	patch(heading.heading, { size, text: picker.heading })

	ownerAttributes(heading.heading, picker.headingAria)
	syncIconButton(heading.prev, size, picker.prevDisabled)
	syncIconButton(heading.next, size, picker.nextDisabled)
	ownerAttributes(heading.prev.button, picker.prevAria)
	ownerAttributes(heading.next.button, picker.nextAria)
}

function drawWeekdays(row: HTMLTableRowElement, weekdays: readonly TCalendarWeekday[]): void {
	while (row.cells.length > weekdays.length) row.lastElementChild?.remove()

	weekdays.forEach((weekday, index) => {
		let cell = row.cells.item(index)

		if (!cell) {
			cell = row.ownerDocument.createElement('th')
			cell.className = 'so-calendar__weekday'
			row.appendChild(cell)
		}

		patch(cell, { textContent: weekday.label })
	})
}

function cellOf(ctx: TCalendarContext, cell: TCalendarCell): HTMLElement {
	const { ownerDocument } = ctx.root

	if (!cell.item) {
		const filler = ownerDocument.createElement('td')

		filler.className = 'so-calendar__filler'
		ownerAttributes(filler, cell.aria)

		return filler
	}

	const day = createItem(ownerDocument, TCalendarItemElement)

	day.ctrl = cell.item
	lendSamples(ctx, day, CALENDAR_ITEM_SLOTS)

	return day
}

/** A day takes everything from its instance. */
function updateCell(node: HTMLElement, cell: TCalendarCell): void {
	if (!cell.item) ownerAttributes(node, cell.aria)
}

function drawWeek(ctx: TCalendarContext, row: HTMLTableRowElement, week: TCalendarCell[]): void {
	let loop = cellLoops.get(row)

	if (!loop) {
		loop = new TKeyedLoop(row, null, (cell: TCalendarCell): TCellKey => cell.item ?? cell.date)
		cellLoops.set(row, loop)
	}

	loop.draw(week, (cell) => cellOf(ctx, cell), updateCell)
}

function weekOf(ctx: TCalendarContext, week: TCalendarCell[]): HTMLTableRowElement {
	const row = ctx.root.ownerDocument.createElement('tr')

	row.className = 'so-calendar__week'
	drawWeek(ctx, row, week)

	return row
}

/** The place's popover instance changed (a new binding without an outside engine) — a new heading. */
function drawMonth(ctx: TCalendarContext, month: TMonth, { index, grid }: TPlace): void {
	const picker = ctx.state.pickers?.[index]

	if (month.heading && month.heading.instance !== picker?.popover) {
		month.heading.popover.remove()
		month.heading = null
	}

	if (!month.heading && picker) {
		month.heading = headingOf(ctx.root.ownerDocument, picker)
		month.node.prepend(month.heading.popover)
	}

	if (month.heading && picker) syncHeading(ctx, month.heading, grid, picker)

	ownerAttributes(month.table, grid.gridAria)
	drawWeekdays(month.weekdays, ctx.state.weekdays ?? [])
	month.weeks.draw(
		grid.weeks.map((cells, place) => ({ cells, place })),
		({ cells }) => weekOf(ctx, cells),
		(row, { cells }) => drawWeek(ctx, row, cells),
	)
}

function monthOf(ctx: TCalendarContext, place: TPlace): HTMLElement {
	const { ownerDocument } = ctx.root
	const node = ownerDocument.createElement('div')
	const table = ownerDocument.createElement('table')
	const thead = ownerDocument.createElement('thead')
	const weekdays = ownerDocument.createElement('tr')
	const tbody = ownerDocument.createElement('tbody')

	node.className = 'so-calendar__month'
	table.className = 'so-calendar__grid'
	// A day's name is the full date: screen readers do not need the header
	thead.setAttribute('aria-hidden', 'true')
	weekdays.className = 'so-calendar__weekdays'
	thead.appendChild(weekdays)
	table.append(thead, tbody)
	node.appendChild(table)

	const month: TMonth = {
		node,
		heading: null,
		table,
		weekdays,
		weeks: new TKeyedLoop(tbody, null, (week: TWeek) => week.place),
	}

	monthsByNode.set(node, month)
	drawMonth(ctx, month, place)

	return node
}

/** After the first month's heading — Tab follows the eye. They do not move: relocation would rebuild them. */
function placePaging(month: TMonth, prev: HTMLElement, next: HTMLElement): void {
	if (next.nextSibling === month.table && prev.nextSibling === next) return

	month.node.insertBefore(prev, month.table)
	month.node.insertBefore(next, month.table)
}

export const calendarTemplate: ITemplate<ICalendar, TCalendarCollectionFacade> = {
	create: (root, { hasSlot }) => {
		const { ownerDocument } = root
		const months = ownerDocument.createElement('div')
		const footer = ownerDocument.createElement('div')
		const prev = iconButton(ownerDocument, PREV, hasSlot('prev-icon'))
		const next = iconButton(ownerDocument, NEXT, hasSlot('next-icon'))

		months.className = 'so-calendar__months'
		footer.className = 'so-calendar__footer'
		root.appendChild(months)

		// The footer in a row of its own: in the months' row it would widen it; empty, it would hold space
		if (hasSlot('footer')) root.appendChild(footer)

		parts.set(root, {
			prev,
			next,
			months: new TKeyedLoop(months, null, (place: TPlace) => place.index),
		})

		return {
			slots: {
				item: { mode: 'sample' },
				'prev-icon': { mode: 'append', node: prev.button, slot: DEFAULT_SLOT },
				'next-icon': { mode: 'append', node: next.button, slot: DEFAULT_SLOT },
				footer: { mode: 'append', node: footer },
			},
		}
	},

	bindings: [
		bind(['grids', 'pickers', 'weekdays', 'size', 'disabled'], (ctx) => {
			const own = parts.get(ctx.root)

			if (!own) return

			const places = (ctx.state.grids ?? []).map((grid, index): TPlace => ({ index, grid }))

			own.months.draw(
				places,
				(place) => monthOf(ctx, place),
				(node, place) => {
					const month = monthsByNode.get(node)

					if (month) drawMonth(ctx, month, place)
				},
			)

			const first = places[0] ? own.months.elementOf(places[0]) : undefined
			const month = first ? monthsByNode.get(first) : undefined

			if (month) placePaging(month, own.prev.button, own.next.button)
		}),

		bind(['size', 'prevDisabled', 'nextDisabled'], ({ root, state }) => {
			const own = parts.get(root)

			if (!own) return

			syncIconButton(own.prev, state.size, state.prevDisabled === true)
			syncIconButton(own.next, state.size, state.nextDisabled === true)
		}),

		bind('prevAria', ({ root, state }) => {
			const button = parts.get(root)?.prev.button

			if (button) ownerAttributes(button, state.prevAria)
		}),

		bind('nextAria', ({ root, state }) => {
			const button = parts.get(root)?.next.button

			if (button) ownerAttributes(button, state.nextAria)
		}),
	],
}
