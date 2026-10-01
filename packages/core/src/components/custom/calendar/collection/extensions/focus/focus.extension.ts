import { TBaseOwnerItemExtension } from '../../../../../base/collection'
import type {
	IBaseOwnerItemExtensionOptions,
	IExtensionContext,
} from '../../../../../base/collection'
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
import type { TCalendarEngineOptions } from '../view'
import { TCalendarFocusItemExtension } from './item'
import type {
	ICalendarFocusExtension,
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
 * Календарь — опция движка (`owner`): он приходит и уходит после сборки, и
 * фокус наблюдает его (`ctx.options.watch`). Пришедший календарь ставит фокус
 * заново — на первую выбранную дату, иначе на сегодня, в границах.
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
		TCalendarFocusEvents,
		TCalendarEngineOptions
	>
	implements ICalendarFocusExtension
{
	readonly name = 'focus' as const

	/** Без календаря фокус стоит на сегодня — пояс среды, границ нет */
	private _focusedDate: TCalendarDate = todayDate()

	constructor(
		options?: IBaseOwnerItemExtensionOptions<ICalendarItem, ICalendarFocusItemExtension>,
	) {
		super(TCalendarFocusItemExtension, options)
	}

	get focusedDate(): TCalendarDate {
		return this._focusedDate
	}

	override install(ctx: IExtensionContext<ICalendarItem, TCalendarEngineOptions>): void {
		super.install(ctx)

		ctx.driver.events.on('change:items', () => this._paintAll())

		viewOf(ctx)?.events.on('change:months', (months, previous) =>
			this._follow(months, previous),
		)

		// Календарь — опция движка: приходит и уходит после сборки. Подписки на
		// него живут в области наблюдателя — сменился календарь, прежние сняты
		ctx.options.watch('owner', (owner, scope) => {
			if (!owner) return

			// Фокус нового календаря — первая выбранная дата, иначе сегодня, в
			// границах и в показанном месяце. Вид к этому моменту уже построен:
			// он наблюдает календарь раньше
			this._set(this._startDate(owner))
			this._settle()
			this._paintAll()

			// Границы сменились — фокус прижимается к ним. Вид к этому моменту уже
			// прижал сетки: его подписка на календарь раньше
			scope.on(owner.events, 'change:min', () => this._move(this._focusedDate))
			scope.on(owner.events, 'change:max', () => this._move(this._focusedDate))

			// Выключенный календарь — без остановки Tab
			scope.on(owner.events, 'change:disabled', () => this._paintAll())
		})
	}

	focusDate(date: TCalendarDate): void {
		const target = parseDate(date)

		if (this._isOff() || target === undefined) return

		this._move(target)
	}

	/** Недоступные дни ходьба не пропускает: фокус на них встаёт. */
	shiftFocus(unit: TDateUnit, count: number): void {
		if (this._isOff()) return

		this._move(shiftDate(this._focusedDate, unit, count))
	}

	moveFocusToEdge(edge: TCalendarWeekEdge): void {
		const owner = this._ctx.options.get('owner')

		if (!owner || owner.disabled) return

		this._move(WEEK_EDGES[edge](this._focusedDate, owner.firstDay))
	}

	/* ------------------------------------------------------------------ */
	/* Внутреннее                                                         */
	/* ------------------------------------------------------------------ */

	/** Границы календаря. Календаря нет — границ тоже. */
	private get _bounds(): TCalendarBounds {
		const owner = this._ctx.options.get('owner')

		return calendarBounds(owner?.min, owner?.max)
	}

	/** Ходить нельзя: календарь выключен или его нет. */
	private _isOff(): boolean {
		return this._ctx.options.get('owner')?.disabled ?? true
	}

	/** С чего календарь начинает: первая выбранная дата, иначе сегодня, в границах. */
	private _startDate(owner: ICalendar): TCalendarDate {
		const bounds = this._bounds
		const first = datesOf(owner.value)[0] ?? todayDate(owner.timeZone)

		return clampDate(first, bounds.low, bounds.high)
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
