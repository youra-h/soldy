import { TValueControl } from '../../base/value-control'
import type { TValueControlStates } from '../../base/value-control'
import type { IComponentOptions, TDefaultValues } from '../../base/component'
import {
	DEFAULT_LOCALE,
	FIRST_DATE,
	LAST_DATE,
	TStateUnit,
	addMonths,
	calendarLocale,
	clampDate,
	compareDates,
	endOfWeek,
	isWeekday,
	monthGrid,
	monthsBetween,
	parseDate,
	shiftDate,
	startOfMonth,
	startOfWeek,
	todayDate,
	weekdayOf,
} from '../../../common'
import { sameValue } from '../../../common/state-unit/same-value'
import type {
	TAriaAttributes,
	TCalendarDate,
	TDateUnit,
	TMonthGridDay,
	TWeekday,
} from '../../../common'
import { NO_MARKS, TMultipleSelection, TRangeSelection, TSingleSelection } from './selection'
import type { ICalendarSelection, TCalendarSelectionCtor } from './selection'
import type {
	ICalendar,
	ICalendarProps,
	TCalendarDay,
	TCalendarEvents,
	TCalendarMode,
	TCalendarMonth,
	TCalendarUnavailable,
	TCalendarValue,
	TCalendarWeekEdge,
	TCalendarWeekday,
} from './types'

/** Стратегия выбора на режим — её заводит сеттер `mode`. */
const SELECTIONS: Readonly<Record<TCalendarMode, TCalendarSelectionCtor>> = {
	single: TSingleSelection,
	multiple: TMultipleSelection,
	range: TRangeSelection,
}

/** Края недели по имени. */
const WEEK_EDGES: Readonly<
	Record<TCalendarWeekEdge, (date: TCalendarDate, first: TWeekday) => TCalendarDate>
> = {
	start: startOfWeek,
	end: endOfWeek,
}

/** Сдвиги дней недели от первого. */
const WEEK: readonly number[] = [0, 1, 2, 3, 4, 5, 6]

/**
 * Календарь: сетка месяцев, фокус по дням и выбор одной даты, нескольких или
 * диапазона. Ядро будущих Calendar и DatePicker — расчёт и модель без вида.
 *
 * Границы слоёв: **значение — здесь, операция — в плагине.**
 *
 * - Даты — строки `YYYY-MM-DD`, а расчёт над ними — чистые функции
 *   `common/calendar`: разбор, сдвиги, сетка месяца, «сегодня», подписи
 *   локали и первый день недели.
 * - Клавиш и указателя ядро не знает. Плагин переводит их в команды
 *   (`shiftFocus`, `moveFocusToEdge`, `showPrev`, `chooseDate`,
 *   `notifyHover`…), а что от команды станет с фокусом, видом и значением,
 *   решает календарь.
 * - Дни — не коллекция: разметка их не регистрирует, их до 42 на месяц, и
 *   при листании они новые. Всё для разметки — выходами со снимками наборов
 *   (`weekdays`, `months`), как ручки Slider.
 *
 * **Значение хранится как задано**, итог отдаёт режим — стратегия выбора
 * (`selection/`). Смена режима — `notify`: итог пересчитан, заданное не
 * тронуто. Задать значение и выбрать дату — разные операции: запись `value`
 * снаружи (и из разметки) переводит фокус на первую дату итога, а
 * `chooseDate` — на выбранную.
 *
 * **Фокус и вид.** Фокус всегда на валидной дате, в границах и в показанных
 * месяцах. Ушёл фокус из вида — вид сдвигается на минимум; листание и запись
 * `month` сдвигают вид и фокус на одно число месяцев. Вид не раньше месяца
 * `min` и не позже месяца `max`; блок, который между ними не помещается,
 * держится у `min`. Фокус, вид, якорь диапазона и день под указателем шлют
 * свои `change:*` — от них зависят выходы.
 */
export default class TCalendar
	extends TValueControl<TCalendarValue, ICalendarProps, TCalendarEvents>
	implements ICalendar
{
	static override baseClass = 's-calendar'

	static defaultValues: typeof TValueControl.defaultValues &
		TDefaultValues<
			ICalendarProps,
			'mode' | 'locale' | 'numberOfMonths',
			'min' | 'max' | 'unavailable' | 'weekStart' | 'timeZone' | 'month'
		> = {
		...TValueControl.defaultValues,
		mode: 'single',
		min: undefined,
		max: undefined,
		unavailable: undefined,
		// Не задан — первый день недели даёт `locale`
		weekStart: undefined,
		locale: DEFAULT_LOCALE,
		timeZone: undefined,
		numberOfMonths: 1,
		month: undefined,
	}

	protected _mode: TCalendarMode
	protected _selection: ICalendarSelection
	protected _min: TCalendarDate | undefined
	protected _max: TCalendarDate | undefined
	protected _unavailable: TCalendarUnavailable | undefined
	protected _weekStart: TWeekday | undefined
	protected _locale: string
	protected _timeZone: string | undefined
	protected _numberOfMonths: number
	protected _focusedDate: TCalendarDate
	/** Первое число первого показанного месяца */
	protected _month: TCalendarDate
	protected _anchor: TCalendarDate | undefined = undefined
	protected _hoveredDate: TCalendarDate | undefined = undefined
	/**
	 * Основа `id` заголовков: блок класса и основа экземпляра, как у заголовка
	 * модального слоя. Номер месяца в блоке дописывает `months`.
	 */
	protected readonly _titleIdBase: string

	constructor(
		props: Partial<ICalendarProps> = {},
		options: IComponentOptions<TValueControlStates<TCalendarValue>> = {},
	) {
		const ctor = new.target as typeof TCalendar
		const initial: TCalendarValue = props.value ?? ctor.defaultValues.value

		// Сверка поэлементная: итог `multiple` и `range` — новый массив на
		// каждое чтение, и по ссылке он менялся бы всегда
		const value = new TStateUnit<TCalendarValue>({ initial, same: sameValue })

		super(props, { ...options, states: { value, ...options.states } })

		this._mode = props.mode ?? ctor.defaultValues.mode
		this._selection = new SELECTIONS[this._mode]()
		this._min = props.min ?? ctor.defaultValues.min
		this._max = props.max ?? ctor.defaultValues.max
		this._unavailable = props.unavailable ?? ctor.defaultValues.unavailable
		this._weekStart = props.weekStart ?? ctor.defaultValues.weekStart
		this._locale = props.locale ?? ctor.defaultValues.locale
		this._timeZone = props.timeZone ?? ctor.defaultValues.timeZone
		this._numberOfMonths = props.numberOfMonths ?? ctor.defaultValues.numberOfMonths
		this._titleIdBase = `${ctor.baseClass}-title-${this.idBase}`

		this._states.value.setResolver((raw) => this._resolve(raw))

		// Фокус — первая дата значения, иначе сегодня, вид — его месяц; затем
		// `month`, как при записи
		const focus = clampDate(
			firstOf(this._dates) ?? todayDate(this._timeZone),
			this._low,
			this._high,
		)

		this._focusedDate = focus
		this._month = this._fitView(startOfMonth(focus), focus)
		this._applyMonth(props.month ?? ctor.defaultValues.month)
	}

	/* ------------------------------------------------------------------ */
	/* Свойства                                                           */
	/* ------------------------------------------------------------------ */

	override get value(): TCalendarValue {
		return this._states.value.value
	}

	/**
	 * Запись снаружи — владелец задаёт календарю дату. Сменился итог — якорь
	 * начатого диапазона снят, а фокус переходит на первую дату итога. Пустое
	 * значение фокус не трогает.
	 *
	 * Выбор пользователя идёт мимо этого сеттера (`chooseDate`): фокус у него
	 * встаёт на выбранную дату, а не на первую.
	 */
	override set value(value: TCalendarValue) {
		const next = this._resolve(value)

		if (!sameValue(next, this.value)) {
			this._setAnchor(undefined)

			const first = firstOf(datesOf(next))

			if (first !== undefined) this._moveFocus(first)
		}

		this._states.value.value = value
	}

	get mode(): TCalendarMode {
		return this._mode
	}

	/** Смена режима пересчитывает итог, не трогая заданного, и снимает якорь. */
	set mode(value: TCalendarMode) {
		if (this._mode === value) return

		const before = this.value

		this._mode = value
		this._selection = new SELECTIONS[value]()
		this._setAnchor(undefined)
		this._states.value.notify(before)
		this.events.emit('change:mode', value)
	}

	/** Невалидная строка границей не считается. */
	get min(): TCalendarDate | undefined {
		return this._min
	}

	set min(value: TCalendarDate | undefined) {
		if (this._min === value) return

		this._min = value
		this._settle()
		this.events.emit('change:min', value)
	}

	/** Раньше `min` — граница схлопывается в `min`. */
	get max(): TCalendarDate | undefined {
		return this._max
	}

	set max(value: TCalendarDate | undefined) {
		if (this._max === value) return

		this._max = value
		this._settle()
		this.events.emit('change:max', value)
	}

	/** Функция сверяется по ссылке: заданная заново — смена. */
	get unavailable(): TCalendarUnavailable | undefined {
		return this._unavailable
	}

	set unavailable(value: TCalendarUnavailable | undefined) {
		if (this._unavailable === value) return

		this._unavailable = value
		this.events.emit('change:unavailable', value)
	}

	/** Не целое от 0 до 6 — как не задан: первый день даёт локаль. */
	get weekStart(): TWeekday | undefined {
		return this._weekStart
	}

	set weekStart(value: TWeekday | undefined) {
		if (this._weekStart === value) return

		this._weekStart = value
		this.events.emit('change:weekStart', value)
	}

	get locale(): string {
		return this._locale
	}

	set locale(value: string) {
		if (this._locale === value) return

		this._locale = value
		this.events.emit('change:locale', value)
	}

	get timeZone(): string | undefined {
		return this._timeZone
	}

	set timeZone(value: string | undefined) {
		if (this._timeZone === value) return

		this._timeZone = value
		this.events.emit('change:timeZone', value)
	}

	/** Не целое и меньше единицы — один месяц. */
	get numberOfMonths(): number {
		return this._numberOfMonths
	}

	set numberOfMonths(value: number) {
		if (this._numberOfMonths === value) return

		this._numberOfMonths = value
		this._settle()
		this.events.emit('change:numberOfMonths', value)
	}

	/** Первое число первого показанного месяца. */
	get month(): TCalendarDate {
		return this._month
	}

	/**
	 * Показать первым месяц даты: вид и фокус сдвигаются на одно число
	 * месяцев. Другое число того же месяца ничего не меняет. `undefined` (и
	 * невалидная строка) — первым показан месяц фокуса.
	 */
	set month(value: TCalendarDate | undefined) {
		this._applyMonth(value)
	}

	get focusedDate(): TCalendarDate {
		return this._focusedDate
	}

	get anchor(): TCalendarDate | undefined {
		return this._anchor
	}

	get hoveredDate(): TCalendarDate | undefined {
		return this._hoveredDate
	}

	get prevDisabled(): boolean {
		return this.disabled || compareDates(this._month, startOfMonth(this._low)) <= 0
	}

	get nextDisabled(): boolean {
		const last = addMonths(this._month, this._count - 1)

		return this.disabled || compareDates(last, startOfMonth(this._high)) >= 0
	}

	/* ------------------------------------------------------------------ */
	/* Команды: выключенный календарь их игнорирует                       */
	/* ------------------------------------------------------------------ */

	focusDate(date: TCalendarDate): void {
		const target = parseDate(date)

		if (this.disabled || target === undefined) return

		this._moveFocus(target)
	}

	/** Недоступные дни ходьба не пропускает: фокус на них встаёт. */
	shiftFocus(unit: TDateUnit, count: number): void {
		if (this.disabled) return

		this._moveFocus(shiftDate(this._focusedDate, unit, count))
	}

	moveFocusToEdge(edge: TCalendarWeekEdge): void {
		if (this.disabled) return

		this._moveFocus(WEEK_EDGES[edge](this._focusedDate, this._firstDay))
	}

	showPrev(): void {
		if (this.disabled) return

		this._showMonth(addMonths(this._month, -1))
	}

	showNext(): void {
		if (this.disabled) return

		this._showMonth(addMonths(this._month, 1))
	}

	/**
	 * Недоступный день и день вне границ не выбираются. Недоступен ли день,
	 * решает `unavailable` с якорем начатого диапазона — у второго конца он
	 * уже стоит.
	 */
	chooseDate(date: TCalendarDate): boolean {
		const chosen = parseDate(date)

		if (this.disabled || chosen === undefined || !this._selectable(chosen)) return false

		const choice = this._selection.choose(chosen, {
			raw: this._states.value.rawValue,
			dates: this._dates,
			anchor: this._anchor,
		})

		// Значение — последним: к `change:value` якорь и фокус уже на месте
		this._setAnchor(choice.anchor)
		this._moveFocus(chosen)
		this._states.value.value = choice.value

		return true
	}

	cancelRange(): void {
		if (this.disabled) return

		this._setAnchor(undefined)
	}

	/**
	 * Сообщение, а не команда: где указатель, календарь узнаёт и выключенным.
	 * Не дата — как `undefined`.
	 */
	notifyHover(date: TCalendarDate | undefined): void {
		const hovered = parseDate(date)

		if (this._hoveredDate === hovered) return

		this._hoveredDate = hovered
		this.events.emit('change:hoveredDate', hovered)
	}

	/* ------------------------------------------------------------------ */
	/* Выходы для разметки — снимки на каждое чтение                     */
	/* ------------------------------------------------------------------ */

	/** Дни недели от первого: короткое имя — подпись колонки, полное — для скринридера. */
	get weekdays(): TCalendarWeekday[] {
		const locale = calendarLocale(this._locale)
		const first = this._firstDay

		return WEEK.map((offset) => {
			const day = weekdayOf(first + offset)

			return {
				short: locale.weekdayName(day, 'short'),
				long: locale.weekdayName(day, 'long'),
			}
		})
	}

	/** Показанные месяцы: заголовок, наборы заголовка и сетки, недели дней. */
	get months(): TCalendarMonth[] {
		const locale = calendarLocale(this._locale)
		const first = this._firstDay
		const multiselectable = this._selection.multiselectable ? 'true' : null
		const paint = this._painter()

		return this._shownMonths().map((key, index) => {
			const id = `${this._titleIdBase}-${index}`

			return {
				key,
				title: locale.monthTitle(key),
				titleAria: { id },
				gridAria: {
					role: 'grid',
					'aria-labelledby': id,
					'aria-multiselectable': multiselectable,
				},
				weeks: monthGrid(key, first).map((week) => week.map(paint)),
			}
		})
	}

	/* ------------------------------------------------------------------ */
	/* Внутреннее                                                         */
	/* ------------------------------------------------------------------ */

	/** Итог значения: даты значения по правилу режима. */
	protected _resolve(raw: TCalendarValue): TCalendarValue {
		return this._selection.resolve(datesOf(raw))
	}

	/** Даты итога — валидные, без повторов, по возрастанию. */
	protected get _dates(): TCalendarDate[] {
		return datesOf(this.value)
	}

	/** Нижняя граница: `min`, если это дата, иначе первая поддерживаемая. */
	protected get _low(): TCalendarDate {
		return parseDate(this._min) ?? FIRST_DATE
	}

	/** Верхняя граница: не раньше нижней. */
	protected get _high(): TCalendarDate {
		const low = this._low
		const high = parseDate(this._max) ?? LAST_DATE

		return compareDates(high, low) < 0 ? low : high
	}

	/** Сколько месяцев показано — целое от единицы. */
	protected get _count(): number {
		const count = Math.floor(this._numberOfMonths)

		return Number.isFinite(count) && count >= 1 ? count : 1
	}

	/** Первый день недели: `weekStart`, а без него — локали. */
	protected get _firstDay(): TWeekday {
		return isWeekday(this._weekStart) ? this._weekStart : calendarLocale(this._locale).firstDay
	}

	/** Первые числа показанных месяцев. За `9999-12` месяцев нет — блок обрывается на нём. */
	protected _shownMonths(): TCalendarDate[] {
		const count = Math.min(this._count, monthsBetween(this._month, LAST_DATE) + 1)

		return Array.from({ length: count }, (_, index) => addMonths(this._month, index))
	}

	protected _isUnavailable(date: TCalendarDate): boolean {
		return Boolean(this._unavailable?.(date, this._anchor))
	}

	protected _inBounds(date: TCalendarDate): boolean {
		return compareDates(date, this._low) >= 0 && compareDates(date, this._high) <= 0
	}

	/** Можно ли выбрать день: в границах и доступен. */
	protected _selectable(date: TCalendarDate): boolean {
		return this._inBounds(date) && !this._isUnavailable(date)
	}

	/**
	 * Вид в пределах границ: первый показанный месяц — от месяца `min` до
	 * месяца, с которого блок кончается на месяце `max`. Не помещается —
	 * держится месяц `min`.
	 */
	protected _clampView(month: TCalendarDate): TCalendarDate {
		const first = startOfMonth(this._low)
		const last = addMonths(startOfMonth(this._high), 1 - this._count)

		return compareDates(last, first) < 0 ? first : clampDate(month, first, last)
	}

	/** Вид, в котором виден фокус: сдвиг от `view` на минимум, в пределах границ. */
	protected _fitView(view: TCalendarDate, focus: TCalendarDate): TCalendarDate {
		const month = startOfMonth(focus)

		if (compareDates(month, view) < 0) return this._clampView(month)

		if (monthsBetween(view, month) >= this._count) {
			return this._clampView(addMonths(month, 1 - this._count))
		}

		return this._clampView(view)
	}

	/** Фокус на дату в границах; ушёл из вида — вид сдвигается на минимум. */
	protected _moveFocus(date: TCalendarDate): void {
		const focus = clampDate(date, this._low, this._high)

		this._apply(focus, this._fitView(this._month, focus))
	}

	/** Показать первым месяц `target`: вид и фокус сдвигаются на одно число месяцев. */
	protected _showMonth(target: TCalendarDate): void {
		const month = this._clampView(startOfMonth(target))
		const shifted = addMonths(this._focusedDate, monthsBetween(this._month, month))
		const focus = clampDate(shifted, this._low, this._high)

		this._apply(focus, this._fitView(month, focus))
	}

	/** Запись `month`: дата — показать её месяц, иначе — месяц фокуса. */
	protected _applyMonth(value: TCalendarDate | undefined): void {
		const date = parseDate(value)

		if (date === undefined) {
			this._apply(
				this._focusedDate,
				this._fitView(startOfMonth(this._focusedDate), this._focusedDate),
			)
		} else {
			this._showMonth(date)
		}
	}

	/** Сменились границы или число месяцев: фокус и вид прижимаются к ним. */
	protected _settle(): void {
		this._moveFocus(this._focusedDate)
	}

	/** Записать фокус и вид; события — после обеих записей и только о смене. */
	protected _apply(focus: TCalendarDate, month: TCalendarDate): void {
		const monthChanged = this._month !== month
		const focusChanged = this._focusedDate !== focus

		this._month = month
		this._focusedDate = focus

		if (monthChanged) this.events.emit('change:month', month)
		if (focusChanged) this.events.emit('change:focusedDate', focus)
	}

	protected _setAnchor(value: TCalendarDate | undefined): void {
		if (this._anchor === value) return

		this._anchor = value
		this.events.emit('change:anchor', value)
	}

	/**
	 * Раскраска дня для одного чтения `months`: всё, что не зависит от дня, —
	 * «сегодня», границы, фокус, отметки выбора — считается один раз.
	 */
	protected _painter(): (day: TMonthGridDay) => TCalendarDay {
		const locale = calendarLocale(this._locale)
		const today = todayDate(this._timeZone)
		const low = this._low
		const high = this._high
		const focused = this._focusedDate
		const enabled = !this.disabled
		const end = clampDate(this._hoveredDate ?? focused, low, high)
		const marker = this._selection.marker(this._dates, this._anchor, end)

		return ({ date, outside }) => {
			const outOfBounds = compareDates(date, low) < 0 || compareDates(date, high) > 0
			const unavailable = this._isUnavailable(date)
			const current = date === today
			// Фокус встаёт на любой день месяца в границах, выбор — ещё и на доступный
			const focusable = enabled && !outOfBounds
			const marks = outside ? NO_MARKS : marker(date)
			const aria: TAriaAttributes = outside
				? placeholderAria()
				: {
						tabindex: focusable ? tabindexOf(date === focused) : null,
						'aria-selected': String(marks.selected),
						'aria-disabled': focusable && !unavailable ? null : 'true',
						'aria-current': current ? 'date' : null,
						'aria-label': locale.fullDate(date),
						'aria-hidden': null,
					}

			return {
				date,
				text: locale.dayNumber(date),
				aria,
				dataset: {
					'data-selected': String(marks.selected),
					'data-today': String(current),
					'data-outside-month': String(outside),
					'data-out-of-bounds': String(outOfBounds),
					'data-unavailable': String(unavailable),
					'data-range-start': String(marks.rangeStart),
					'data-range-end': String(marks.rangeEnd),
					'data-range-middle': String(marks.rangeMiddle),
					'data-preview': String(marks.preview),
				},
			}
		}
	}

	override getProps(): ICalendarProps {
		return {
			...super.getProps(),
			mode: this._mode,
			min: this._min,
			max: this._max,
			unavailable: this._unavailable,
			weekStart: this._weekStart,
			locale: this._locale,
			timeZone: this._timeZone,
			numberOfMonths: this._numberOfMonths,
			month: this._month,
		}
	}
}

/**
 * Даты значения: валидные, без повторов, по возрастанию. Строки не в формате
 * даты выпадают; значение любой формы — дата, массив, `undefined` — даёт
 * список.
 */
function datesOf(value: TCalendarValue): TCalendarDate[] {
	const list: readonly unknown[] = Array.isArray(value) ? value : [value]
	const dates = list.map((item) => parseDate(item)).filter((date) => date !== undefined)

	return [...new Set(dates)].sort(compareDates)
}

function firstOf(dates: readonly TCalendarDate[]): TCalendarDate | undefined {
	return dates.length > 0 ? dates[0] : undefined
}

/** Roving tabindex: остановка Tab — только день с фокусом, остальные фокусирует код. */
function tabindexOf(focused: boolean): string {
	return focused ? '0' : '-1'
}

/**
 * Заполнитель соседнего месяца скрыт от скринридера: при нескольких месяцах
 * его дата звучала бы дважды. Ключи — те же, что у дня месяца.
 */
function placeholderAria(): TAriaAttributes {
	return {
		tabindex: null,
		'aria-selected': null,
		'aria-disabled': null,
		'aria-current': null,
		'aria-label': null,
		'aria-hidden': 'true',
	}
}
