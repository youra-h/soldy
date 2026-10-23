/**
 * Шаблон Calendar: месяцы в ряд петлёй по месту сетки, одна пара кнопок листания
 * у первого месяца, подвал — своей строкой. Обработчиков нет: нажатия и клавиши
 * ловят плагины на корне. docs/architecture.md, Layer 8d, «Даты».
 */

import type {
	ICalendar,
	ICalendarItem,
	IPopover,
	TCalendarCell,
	TCalendarCollectionFacade,
	TCalendarGrid,
	TCalendarPicker,
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

/** Образец календаря → слот дня (`setup/__tests__/item-slots.spec.ts`). */
export const CALENDAR_ITEM_SLOTS: TItemSlots = {
	item: 'default',
}

/** Заголовок месяца — Popover на `div`: панель лежит в корне, а в `span` блоку не место. */
const TPopoverDivElement = registerPopoverTag('div')

type TCalendarContext = ITemplateContext<ICalendar, TCalendarCollectionFacade>

/** `arrowRight` у обеих стрелок: «назад» зеркалит тема. */
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
	readonly list: TListBoxElementProps
	readonly heading: TButtonElementProps
	readonly prev: TIconButton
	readonly next: TIconButton
}

type TMonth = {
	readonly node: HTMLElement
	/** Заголовок — пока у места есть панель выбора. */
	heading: THeading | null
	readonly table: HTMLTableElement
	readonly weekdays: HTMLTableRowElement
	readonly weeks: TKeyedLoop<TCalendarCell[], string, HTMLTableRowElement>
}

/**
 * Ключ месяца — место, а не месяц: при листании кнопка заголовка, её поповер и
 * живая область остаются теми же узлами — фокус из панели не падает, смена объявляется.
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

/** Экземпляры места — до вставки: сборка берёт их при подключении. */
function headingOf(owner: Document, picker: TCalendarPicker): THeading {
	const popover = createDetail(owner, TPopoverDivElement, { embedded: 'calendar.picker' })
	const title = createDetail(owner, TButtonElement, {
		embedded: 'calendar.title',
		attributes: { type: 'button' },
	})
	const titleText = owner.createElement('span')
	const card = owner.createElement('div')
	const list = createDetail(owner, TListBoxElement, { embedded: 'calendar.picker-list' })
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
	list.className = 'so-calendar__picker-list'
	list.ctrl = picker.list
	list.engine = picker.engine
	list.indicator = 'none'
	header.className = 'so-calendar__picker-header'
	heading.className = 'so-calendar__picker-heading'

	// Части в детали до поповера: в документ входят одной вставкой и собираются
	// по разу. Список раньше шапки: фокус при открытии встаёт на него
	lend(title, DEFAULT_SLOT, titleText)
	header.append(heading, prev.button, next.button)
	card.append(list, header)
	lend(popover, 'trigger', title)
	lend(popover, DEFAULT_SLOT, card)

	return { popover, instance: picker.popover, title, titleText, list, heading, prev, next }
}

function syncHeading(
	ctx: TCalendarContext,
	heading: THeading,
	grid: TCalendarGrid,
	picker: TCalendarPicker,
): void {
	const { size } = ctx.state
	const disabled = ctx.state.disabled === true
	const { popover, title, titleText, list } = heading

	patch(title, { size, disabled })

	// Живая область — текст, а не контрол
	ownerAttributes(titleText, grid.titleAria)

	patch(titleText, { textContent: grid.title })
	patch(popover, { aria_labelledBy: picker.labelledBy })
	patch(list, { size, aria_labelledBy: picker.labelledBy })
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

/** День всё берёт у своего инстанса. */
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

/** Сменился экземпляр поповера места (новая связка без движка снаружи) — заголовок новый. */
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
		grid.weeks,
		(week) => weekOf(ctx, week),
		(row, week) => drawWeek(ctx, row, week),
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
	// Имя дня — полная дата: шапка скринридеру не нужна
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
		weeks: new TKeyedLoop(tbody, null, (week: TCalendarCell[]) => week[0]?.date ?? ''),
	}

	monthsByNode.set(node, month)
	drawMonth(ctx, month, place)

	return node
}

/** За заголовком первого месяца — Tab идёт за глазом. Не двигаются: перенос пересобрал бы их. */
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

		// Подвал — своей строкой: в ряду месяцев расширил бы его; пустой держал бы место
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
