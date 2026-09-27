import { TBaseOwnerItemExtension } from '../../../../../base/collection'
import type { IExtensionContext } from '../../../../../base/collection'
import {
	addMonths,
	clampDate,
	endOfWeek,
	monthsBetween,
	parseDate,
	shiftDate,
	startOfMonth,
	startOfWeek,
	todayDate,
} from '../../../../../../common'
import type { TCalendarDate, TDateUnit, TWeekday } from '../../../../../../common'
import { calendarBounds, datesOf } from '../../../dates'
import type { TCalendarBounds } from '../../../dates'
import type { ICalendarItem } from '../../../item/types'
import type { ICalendar } from '../../../types'
import { viewOf } from '../guards'
import { TCalendarFocusItemExtension } from './item'
import type {
	ICalendarFocusExtension,
	ICalendarFocusExtensionOptions,
	ICalendarFocusItemExtension,
	TCalendarFocusEvents,
	TCalendarWeekEdge,
} from './types'

/** Края недели по имени. */
const WEEK_EDGES: Readonly<
	Record<TCalendarWeekEdge, (date: TCalendarDate, first: TWeekday) => TCalendarDate>
> = {
	start: startOfWeek,
	end: endOfWeek,
}

/**
 * Фокус сетки: одна остановка Tab на все сетки календаря (roving tabindex,
 * APG Date Picker Dialog).
 *
 * **День с фокусом — всегда в границах и в показанном месяце.** Ушёл фокус в
 * непоказанный месяц — расширение просит вид показать его (`reveal`): сетки
 * сдвигаются на столько, на сколько фокус ушёл от своего месяца. Сдвинули
 * сетки листанием или выбором месяца — фокус едет со своей сеткой на столько
 * же месяцев.
 *
 * Где фокус стоит в DOM, ядро не знает: `tabindex` дня пишет это расширение,
 * а переводит DOM-фокус на день с `tabindex="0"` плагин. Недоступные дни
 * ходьба не пропускает — фокус на них встаёт; дни вне границ выключены и
 * фокуса не получают.
 */
export class TCalendarFocusExtension
	extends TBaseOwnerItemExtension<
		ICalendarItem,
		ICalendarFocusItemExtension,
		TCalendarFocusEvents
	>
	implements ICalendarFocusExtension
{
	readonly name = 'focus' as const

	protected readonly _owner: ICalendar
	private _focusedDate: TCalendarDate

	constructor(options: ICalendarFocusExtensionOptions) {
		super(TCalendarFocusItemExtension, options)

		this._owner = options.owner

		// Фокус — первая выбранная дата, иначе сегодня, в границах. В показанный
		// месяц его приводит `install`, когда вид уже есть
		const bounds = this._bounds
		const first = datesOf(options.owner.value)[0] ?? todayDate(options.owner.timeZone)

		this._focusedDate = clampDate(first, bounds.low, bounds.high)
	}

	get focusedDate(): TCalendarDate {
		return this._focusedDate
	}

	override install(ctx: IExtensionContext<ICalendarItem>): void {
		super.install(ctx)

		const view = viewOf(ctx)
		const owner = this._owner

		ctx.driver.events.on('change:items', () => this._paintAll())

		view?.events.on('change:months', (months, previous) => this._follow(months, previous))

		// Границы сменились — фокус прижимается к ним. Вид к этому моменту уже
		// прижал сетки: его подписка на календарь раньше
		owner.events.on('change:min', () => this._move(this._focusedDate))
		owner.events.on('change:max', () => this._move(this._focusedDate))

		// Выключенный календарь — без остановки Tab
		owner.events.on('change:disabled', () => this._paintAll())

		this._settle()
		this._paintAll()
	}

	focusDate(date: TCalendarDate): void {
		const target = parseDate(date)

		if (this._owner.disabled || target === undefined) return

		this._move(target)
	}

	/** Недоступные дни ходьба не пропускает: фокус на них встаёт. */
	shiftFocus(unit: TDateUnit, count: number): void {
		if (this._owner.disabled) return

		this._move(shiftDate(this._focusedDate, unit, count))
	}

	moveFocusToEdge(edge: TCalendarWeekEdge): void {
		if (this._owner.disabled) return

		this._move(WEEK_EDGES[edge](this._focusedDate, this._owner.firstDay))
	}

	/* ------------------------------------------------------------------ */
	/* Внутреннее                                                         */
	/* ------------------------------------------------------------------ */

	private get _bounds(): TCalendarBounds {
		return calendarBounds(this._owner.min, this._owner.max)
	}

	/**
	 * Фокус на дату в границах; ушёл в непоказанный месяц — вид показывает его,
	 * сдвигая сетки на столько, на сколько фокус ушёл от своего месяца.
	 */
	private _move(date: TCalendarDate): void {
		const bounds = this._bounds
		const focus = clampDate(date, bounds.low, bounds.high)
		const from = this._focusedDate

		this._set(focus)
		viewOf(this._ctx)?.reveal(focus, from)
	}

	/**
	 * Сетки сдвинули — фокус едет со своей сеткой на столько же месяцев. Был
	 * фокус не в показанном месяце (вид показывает его по `reveal`) — он уже
	 * на месте.
	 */
	private _follow(months: TCalendarDate[], previous: TCalendarDate[]): void {
		const index = previous.indexOf(startOfMonth(this._focusedDate))

		if (index !== -1 && months[index] !== undefined) {
			const shift = monthsBetween(previous[index], months[index])

			if (shift !== 0) this._set(addMonths(this._focusedDate, shift))
		}

		this._settle()
	}

	/**
	 * Фокус в границах и в показанном месяце. Месяц не показан (сетки задали
	 * заново) — фокус встаёт на первый доступный день первой сетки: её месяц
	 * вид держит в границах, и прижатое первое число остаётся в нём.
	 */
	private _settle(): void {
		const bounds = this._bounds
		const months = viewOf(this._ctx)?.months ?? []
		const focus = clampDate(this._focusedDate, bounds.low, bounds.high)

		if (months.length > 0 && !months.includes(startOfMonth(focus))) {
			this._set(clampDate(months[0], bounds.low, bounds.high))

			return
		}

		this._set(focus)
	}

	private _set(focus: TCalendarDate): void {
		if (this._focusedDate === focus) return

		this._focusedDate = focus
		this.events.emit('change:focusedDate', focus)
		this._paintAll()
	}

	/**
	 * Roving tabindex: `0` у дня с фокусом, `-1` у прочих доступных для фокуса.
	 * Выключенный день (вне границ или календарь выключен) остановки не имеет.
	 */
	private _paintAll(): void {
		if (!this._ctx) return

		for (const item of this._ctx.driver.valueOf()) {
			const tabindex = item.disabled ? null : item.date === this._focusedDate ? '0' : '-1'

			item.aria.add('tabindex', tabindex)
		}
	}
}
