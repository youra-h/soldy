/**
 * Шаблон Calendar — сетки показанных месяцев, одна пара кнопок листания на все
 * и подвал, если его передали, как у Vue.
 *
 * Корень — сам `<div is="so-calendar">`: классы, наборы `attrs`, `aria` и
 * `dataset` (`data-disabled`) и скрытие раскладывает на него база
 * (`SoldyElement`). Роли у корня нет: сетку по APG (Date Picker Dialog) несёт
 * каждая таблица. Обработчиков у шаблона нет: нажатия по дням, кнопкам
 * листания, шапке и подложке панели выбора и наведение ловит плагин указателя,
 * клавиши — плагин клавиатуры, оба слушают корень и зовут команды коллекции.
 * Слота по умолчанию нет: дни кладёт в коллекцию вид по месяцам сеток.
 *
 * - Месяцы — в ряд, своей строкой (`div.so-calendar__months`), подвал —
 *   отдельной строкой под ним (`div.so-calendar__footer`, только при слоте
 *   `footer`): в одном ряду с месяцами он расширил бы его своей шириной.
 * - Месяц — по одному на сетку (`grids`), петлёй по месту (`TKeyedLoop`, ключ
 *   — номер сетки, как `:key="index"` у Vue): заголовок и его панель выбора —
 *   у места, листание меняет месяц, а кнопка заголовка, её поповер и живая
 *   область остаются тем же узлом. Иначе выбранный в панели месяц пересобрал
 *   бы кнопку, фокус, который панель возвращает на неё, упал бы на страницу,
 *   а новая живая область смену месяца не объявила бы.
 * - Заголовок месяца — кнопка-триггер панели выбора месяца и года. Панель —
 *   Popover места (`pickers[index]`) на `div`, деталь
 *   `<div is="so-popover-div" embedded="calendar.picker">` с классом
 *   `so-calendar__heading` над экземпляром поповера, который создаёт и ведёт
 *   расширение `picker`: `ctrl` — до вставки. Поповер — внутри календаря
 *   (`contained`, `edge="top"`): панель не уходит в `body`, а выезжает сверху
 *   календаря. Корень поповера — `div`: панель лежит в нём, а в строчном
 *   `span` блочной разметке не место. Экземпляр поповера места сменился —
 *   новая связка без движка снаружи, — деталь строится заново, как ряд тегов у
 *   Select.
 * - Триггер поповера — деталь `<button is="so-button" embedded="calendar.title"
 *   type="button">` с классом `so-calendar__title`, отданная в слот `trigger`
 *   поповера (`lend`): связку с панелью и вид «нажат» на неё кладёт сам
 *   Popover — scope у слотов нет. Размер и выключенность — календаря. Текст —
 *   во вложенном `span.so-calendar__title-text` с набором `titleAria` сетки
 *   (`id`, на который ссылается сетка, и `aria-live`): живая область — текст,
 *   а не контрол.
 * - Содержимое панели — карточка `div.so-calendar__picker`: список места —
 *   деталь ListBox `calendar.picker-list` над экземпляром и движком места
 *   (`indicator="none"`, имя — шапкой), — и шапка: кнопка года
 *   `calendar.picker-heading` с набором `headingAria` и текстом шапки, затем
 *   стрелки `calendar.picker-prev` и `calendar.picker-next` с наборами и
 *   выключенностью по уровню. Список в DOM раньше шапки: фокус при открытии
 *   встаёт на список. Содержимое до первого открытия вне документа: поповер
 *   места — с `lazyMount`.
 * - Кнопки листания — одна пара на весь календарь, у первого месяца, сразу за
 *   его заголовком: Tab идёт за глазом. Детали `calendar.prev` и
 *   `calendar.next`, вида нет — красит тема по контексту; выключенность — вид
 *   коллекции, имена — наборы `prevAria` и `nextAria`. Значок — слот
 *   `prev-icon` или `next-icon` в слот по умолчанию кнопки, иначе иконка роли
 *   `arrowRight` у обеих: стрелку «назад» зеркалит тема.
 * - Сетка — `table.so-calendar__grid` с набором `gridAria` (`role="grid"`, имя
 *   от заголовка, `aria-multiselectable`). Шапка дней недели скрыта от
 *   скринридера (`aria-hidden` на `thead`): имя дня — полная дата. Подписи
 *   колонок — `weekdays` по месту.
 * - Недели — петлёй по ключу первой даты, ячейки — по ключу дня: у дня — его
 *   элемент коллекции, у заполнителя — дата. Записи сеток новые на каждую
 *   смену, а день, оставшийся на экране, — тот же узел, с фокусом на нём;
 *   элемент дня сменился (новая связка без движка снаружи) — новый узел. День
 *   — элемент коллекции `<td is="so-calendar-item">` с инстансом дня и копией
 *   образца `item` в слоте по умолчанию — до вставки; заполнитель — пустой
 *   `td.so-calendar__filler` с набором ячейки (`aria-hidden`).
 *
 * Слот со scope (`item`) у Web Components — образец (`<template slot="item">`):
 * копию получает каждый день. Данные копия берёт у дня — `el.ctrl`
 * ближайшего `.so-calendar-item`.
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
} from '../../adapter'
import { TButtonElement, type TButtonElementProps } from '../button'
import { TIconElement, type TIconElementProps } from '../icon'
import { TListBoxElement, type TListBoxElementProps } from '../list-box'
import { registerPopoverTag, type TPopoverElementProps } from '../popover'
import { TCalendarItemElement, type TCalendarItemElementProps } from './item'

/**
 * Копия образца в день: слот календаря → слот дня, как проброс у остальных
 * адаптеров (`setup/__tests__/item-slots.spec.ts`).
 */
export const CALENDAR_ITEM_SLOTS: TItemSlots = {
	item: 'default',
}

/** Заголовок месяца — Popover на `div`: регистрирует его фабрика поповера, здесь тег нужен впервые. */
const TPopoverDivElement = registerPopoverTag('div')

/** Контекст шаблона календаря. */
type TCalendarContext = ITemplateContext<ICalendar, TCalendarCollectionFacade>

/** Кнопка со стрелкой и её иконка; иконки нет, когда задан слот значка. */
type TArrow = {
	readonly button: TButtonElementProps
	readonly icon: TIconElementProps | null
}

/** Как построить стрелку: имена мест и класс кнопки. */
type TArrowSpec = {
	/** Имя места кнопки (`embedded`). */
	readonly embedded: string
	/** Имя места иконки значка. */
	readonly iconEmbedded: string
	/** Класс кнопки: по нему кнопку находят плагины календаря. */
	readonly className: string
}

const PREV: TArrowSpec = {
	embedded: 'calendar.prev',
	iconEmbedded: 'calendar.prev-icon',
	className: 'so-calendar__prev',
}

const NEXT: TArrowSpec = {
	embedded: 'calendar.next',
	iconEmbedded: 'calendar.next-icon',
	className: 'so-calendar__next',
}

const PICKER_PREV: TArrowSpec = {
	embedded: 'calendar.picker-prev',
	iconEmbedded: 'calendar.picker-prev-icon',
	className: 'so-calendar__picker-prev',
}

const PICKER_NEXT: TArrowSpec = {
	embedded: 'calendar.picker-next',
	iconEmbedded: 'calendar.picker-next-icon',
	className: 'so-calendar__picker-next',
}

/**
 * Заголовок месяца — поповер места над его экземпляром и части в нём: кнопка
 * заголовка с текстом, список и шапка панели выбора.
 */
type THeading = {
	readonly popover: TPopoverElementProps<HTMLDivElement>
	/** Экземпляр поповера места, над которым построена деталь. */
	readonly instance: IPopover
	readonly title: TButtonElementProps
	readonly titleText: HTMLElement
	readonly list: TListBoxElementProps
	readonly heading: TButtonElementProps
	readonly prev: TArrow
	readonly next: TArrow
}

/** Месяц на месте сетки: заголовок, сетка и её недели. */
type TMonth = {
	readonly node: HTMLElement
	/** Заголовок — пока у места есть панель выбора. */
	heading: THeading | null
	readonly table: HTMLTableElement
	readonly weekdays: HTMLTableRowElement
	/** Петля недель — по ключу первой даты. */
	readonly weeks: TKeyedLoop<TCalendarCell[], string, HTMLTableRowElement>
}

/** Место сетки и её запись: ключ месяца — место, а не месяц. */
type TPlace = {
	readonly index: number
	readonly grid: TCalendarGrid
}

/** Ключ ячейки: у дня — его элемент коллекции, у заполнителя — дата. */
type TCellKey = ICalendarItem | string

/** Части календаря — одни на всё время жизни элемента. */
type TCalendarParts = {
	readonly prev: TArrow
	readonly next: TArrow
	/** Петля месяцев в ряду — по месту сетки. */
	readonly months: TKeyedLoop<TPlace, number, HTMLElement>
}

const parts = new WeakMap<HTMLElement, TCalendarParts>()

/** Месяц по своему узлу — узлы месяцев держит петля. */
const monthsByNode = new WeakMap<HTMLElement, TMonth>()

/** Петля ячеек каждой недели — внутри её строки. */
const cellLoops = new WeakMap<
	HTMLTableRowElement,
	TKeyedLoop<TCalendarCell, TCellKey, HTMLElement>
>()

function isButton(node: Element): node is TButtonElementProps {
	return node instanceof TButtonElement
}

function isIcon(node: Element): node is TIconElementProps {
	return node instanceof TIconElement
}

function isListBox(node: Element): node is TListBoxElementProps {
	return node instanceof TListBoxElement
}

function isPopover(node: Element): node is TPopoverElementProps<HTMLDivElement> {
	return node instanceof TPopoverDivElement
}

function isDay(node: Element): node is TCalendarItemElementProps {
	return node instanceof TCalendarItemElement
}

/**
 * Кнопка со стрелкой — деталь разметки. Своя иконка — только без слота
 * значка: заданный слот заменяет её целиком. Роль одна на все стрелки,
 * `arrowRight`: роли «влево» в контракте иконок нет, и ту стрелку, что смотрит
 * в начало строки, зеркалит тема. Нажатий шаблон не слушает: их ловит плагин
 * указателя календаря на корне.
 */
function arrowOf(owner: Document, spec: TArrowSpec, slotted: boolean): TArrow {
	const button = createDetail(
		owner,
		'button',
		{ is: 'so-button', embedded: spec.embedded, attributes: { type: 'button' } },
		isButton,
	)

	button.className = spec.className

	if (slotted) return { button, icon: null }

	const icon = createDetail(owner, 'span', { is: 'so-icon', embedded: spec.iconEmbedded }, isIcon)

	icon.icon = 'arrowRight'
	lend(button, DEFAULT_SLOT, icon)

	return { button, icon }
}

/** Пропсы стрелки и её иконки — только сменившиеся: `disabled` кнопки нативный. */
function syncArrow(arrow: TArrow, size: TButtonElementProps['size'], disabled: boolean): void {
	const { button, icon } = arrow

	if (button.size !== size) button.size = size
	if (button.disabled !== disabled) button.disabled = disabled
	if (icon && icon.size !== size) icon.size = size
}

/**
 * Заголовок месяца над поповером места — деталь разметки со своими частями:
 * кнопка заголовка — в слоте `trigger` поповера, карточка панели — в его слоте
 * по умолчанию. Экземпляры места — до вставки: сборка берёт их при
 * подключении.
 */
function headingOf(owner: Document, picker: TCalendarPicker): THeading {
	const popover = createDetail(
		owner,
		'div',
		{ is: 'so-popover-div', embedded: 'calendar.picker' },
		isPopover,
	)
	const title = createDetail(
		owner,
		'button',
		{ is: 'so-button', embedded: 'calendar.title', attributes: { type: 'button' } },
		isButton,
	)
	const titleText = owner.createElement('span')
	const card = owner.createElement('div')
	const list = createDetail(
		owner,
		'div',
		{ is: 'so-list-box', embedded: 'calendar.picker-list' },
		isListBox,
	)
	const header = owner.createElement('div')
	const heading = createDetail(
		owner,
		'button',
		{ is: 'so-button', embedded: 'calendar.picker-heading', attributes: { type: 'button' } },
		isButton,
	)
	const prev = arrowOf(owner, PICKER_PREV, false)
	const next = arrowOf(owner, PICKER_NEXT, false)

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

	// Сначала части в детали, потом детали в поповер: они входят в документ
	// одной вставкой и собираются по одному разу. В шапке год — перед
	// стрелками, а список в карточке — раньше шапки
	lend(title, DEFAULT_SLOT, titleText)
	header.append(heading, prev.button, next.button)
	card.append(list, header)
	lend(popover, 'trigger', title)
	lend(popover, DEFAULT_SLOT, card)

	return { popover, instance: picker.popover, title, titleText, list, heading, prev, next }
}

/**
 * Заголовок месяца — по сетке и панели места: текст и живая область кнопки
 * заголовка, имя поповера и списка, шапка и стрелки панели. Пропсы деталей —
 * только сменившиеся.
 */
function syncHeading(
	ctx: TCalendarContext,
	heading: THeading,
	grid: TCalendarGrid,
	picker: TCalendarPicker,
): void {
	const { size } = ctx.state
	const disabled = ctx.state.disabled === true
	const { popover, title, titleText, list } = heading

	if (title.size !== size) title.size = size
	if (title.disabled !== disabled) title.disabled = disabled

	ownerAttributes(titleText, grid.titleAria)

	if (titleText.textContent !== grid.title) titleText.textContent = grid.title
	if (popover.aria_labelledBy !== picker.labelledBy) popover.aria_labelledBy = picker.labelledBy
	if (list.size !== size) list.size = size
	if (list.aria_labelledBy !== picker.labelledBy) list.aria_labelledBy = picker.labelledBy
	if (heading.heading.size !== size) heading.heading.size = size
	if (heading.heading.text !== picker.heading) heading.heading.text = picker.heading

	ownerAttributes(heading.heading, picker.headingAria)
	syncArrow(heading.prev, size, picker.prevDisabled)
	syncArrow(heading.next, size, picker.nextDisabled)
	ownerAttributes(heading.prev.button, picker.prevAria)
	ownerAttributes(heading.next.button, picker.nextAria)
}

/**
 * Подписи колонок — `th` по месту, по одной на день недели: короткое имя или
 * узкое, какое выбрало ядро по локали.
 */
function drawWeekdays(row: HTMLTableRowElement, weekdays: readonly TCalendarWeekday[]): void {
	while (row.cells.length > weekdays.length) row.lastElementChild?.remove()

	weekdays.forEach((weekday, index) => {
		let cell = row.cells.item(index)

		if (!cell) {
			cell = row.ownerDocument.createElement('th')
			cell.className = 'so-calendar__weekday'
			row.appendChild(cell)
		}

		if (cell.textContent !== weekday.label) cell.textContent = weekday.label
	})
}

/**
 * Ячейка недели: день — элемент коллекции с инстансом дня и копией образца
 * `item` до вставки, заполнитель — пустая ячейка с набором ячейки.
 */
function cellOf(ctx: TCalendarContext, cell: TCalendarCell): HTMLElement {
	const { ownerDocument } = ctx.root

	if (!cell.item) {
		const filler = ownerDocument.createElement('td')

		filler.className = 'so-calendar__filler'
		ownerAttributes(filler, cell.aria)

		return filler
	}

	const day = createItem(ownerDocument, 'td', 'so-calendar-item', isDay)

	day.ctrl = cell.item
	lendSamples(ctx, day, CALENDAR_ITEM_SLOTS)

	return day
}

/** Живой ячейке — её запись: заполнителю — набор, день всё берёт у своего инстанса. */
function updateCell(node: HTMLElement, cell: TCalendarCell): void {
	if (!cell.item) ownerAttributes(node, cell.aria)
}

/** Ячейки недели — своей петлёй внутри её строки. */
function drawWeek(ctx: TCalendarContext, row: HTMLTableRowElement, week: TCalendarCell[]): void {
	let loop = cellLoops.get(row)

	if (!loop) {
		loop = new TKeyedLoop(row, null, (cell: TCalendarCell): TCellKey => cell.item ?? cell.date)
		cellLoops.set(row, loop)
	}

	loop.draw(week, (cell) => cellOf(ctx, cell), updateCell)
}

/** Строка недели — семь ячеек, от первого дня недели. */
function weekOf(ctx: TCalendarContext, week: TCalendarCell[]): HTMLTableRowElement {
	const row = ctx.root.ownerDocument.createElement('tr')

	row.className = 'so-calendar__week'
	drawWeek(ctx, row, week)

	return row
}

/**
 * Месяц места — по его сетке и панели выбора: заголовок (новый, когда у места
 * сменился экземпляр поповера), подписи колонок, набор сетки и недели.
 */
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

/** Узел месяца места: блок с сеткой — `table` с шапкой дней недели и неделями. */
function monthOf(ctx: TCalendarContext, place: TPlace): HTMLElement {
	const { ownerDocument } = ctx.root
	const node = ownerDocument.createElement('div')
	const table = ownerDocument.createElement('table')
	const thead = ownerDocument.createElement('thead')
	const weekdays = ownerDocument.createElement('tr')
	const tbody = ownerDocument.createElement('tbody')

	node.className = 'so-calendar__month'
	table.className = 'so-calendar__grid'
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

/**
 * Кнопки листания — у первого месяца, сразу за его заголовком, перед сеткой.
 * Стоят на месте — не двигаются: перенос пересобрал бы их.
 */
function placePaging(month: TMonth, prev: HTMLElement, next: HTMLElement): void {
	if (next.nextSibling === month.table && prev.nextSibling === next) return

	month.node.insertBefore(prev, month.table)
	month.node.insertBefore(next, month.table)
}

export const calendarTemplate: ITemplate<ICalendar, TCalendarCollectionFacade> = {
	create: (root, hasSlot) => {
		const { ownerDocument } = root
		const months = ownerDocument.createElement('div')
		const footer = ownerDocument.createElement('div')
		const prev = arrowOf(ownerDocument, PREV, hasSlot('prev-icon'))
		const next = arrowOf(ownerDocument, NEXT, hasSlot('next-icon'))

		months.className = 'so-calendar__months'
		footer.className = 'so-calendar__footer'
		root.appendChild(months)

		// Подвал — только при слоте: пустая строка держала бы место под сетками
		if (hasSlot('footer')) root.appendChild(footer)

		parts.set(root, {
			prev,
			next,
			months: new TKeyedLoop(months, null, (place: TPlace) => place.index),
		})

		return {
			// Содержимое дня — образец: копию шаблон кладёт в каждый день; значки —
			// в слот по умолчанию своей кнопки листания
			slots: {
				item: { mode: 'sample' },
				'prev-icon': { mode: 'append', node: prev.button, slot: DEFAULT_SLOT },
				'next-icon': { mode: 'append', node: next.button, slot: DEFAULT_SLOT },
				footer: { mode: 'append', node: footer },
			},
		}
	},

	bindings: [
		// Месяцы — по сеткам и панелям мест; подписи колонок и размер — им же
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

			syncArrow(own.prev, state.size, state.prevDisabled === true)
			syncArrow(own.next, state.size, state.nextDisabled === true)
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
