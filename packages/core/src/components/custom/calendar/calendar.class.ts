import { TValueControl } from '../../base/value-control'
import type { TDefaultValues } from '../../base/component'
import {
	DEFAULT_LOCALE,
	DEFAULT_TRANSLATIONS,
	calendarLocale,
	isWeekday,
	weekdayOf,
} from '../../../common'
import { sameValue } from '../../../common/utility/same-value'
import type { TAriaAttributes, TCalendarDate, TTranslations, TWeekday } from '../../../common'
import type {
	ICalendar,
	ICalendarProps,
	TCalendarEvents,
	TCalendarUnavailable,
	TCalendarValue,
	TCalendarWeekday,
} from './types'

/** Сдвиги дней недели от первого. */
const WEEK: readonly number[] = [0, 1, 2, 3, 4, 5, 6]

/**
 * Календарь — владелец коллекции дней.
 *
 * Сам он держит только то, что задаёт потребитель: значение, границы,
 * недоступные дни, пояс «сегодня» и месяцы сеток, — и то, что задаёт
 * приложение на всю библиотеку: язык (`locale`) и словарь строк
 * (`translations`, раздел `calendar` — имена кнопок листания и стрелок панели
 * выбора). Всё, что календарь делает с днями, — коллекция и её расширения
 * (`collection/extensions`): `view` кладёт в неё дни показанных месяцев,
 * `selection` выбирает, `focus` ведёт фокус по сетке. Режим выбора (`mode`) —
 * свойство коллекции, как у ListBox.
 *
 * Значение хранится как задано: что из него выбрано, решает режим, и
 * выбор пользователя пишет значение уже в форме режима.
 *
 * Клавиш и указателя ядро не знает: плагин переводит их в команды
 * расширений коллекции.
 */
export default class TCalendar
	extends TValueControl<TCalendarValue, ICalendarProps, TCalendarEvents>
	implements ICalendar
{
	static override baseClass = 's-calendar'

	static defaultValues: typeof TValueControl.defaultValues &
		TDefaultValues<
			ICalendarProps,
			'locale',
			'min' | 'max' | 'unavailable' | 'weekStart' | 'timeZone' | 'months'
		> = {
		...TValueControl.defaultValues,
		min: undefined,
		max: undefined,
		unavailable: undefined,
		// Не задан — первый день недели даёт `locale`
		weekStart: undefined,
		locale: DEFAULT_LOCALE,
		timeZone: undefined,
		months: undefined,
	}

	protected _min: TCalendarDate | undefined
	protected _max: TCalendarDate | undefined
	protected _unavailable: TCalendarUnavailable | undefined
	protected _weekStart: TWeekday | undefined
	protected _locale: string
	protected _timeZone: string | undefined
	protected _months: TCalendarDate[] | undefined
	protected _translations: TTranslations = DEFAULT_TRANSLATIONS

	constructor(props: Partial<ICalendarProps> = {}) {
		const ctor = new.target as typeof TCalendar

		// `value` база сверяет поэлементно (`sameValue`): `multiple` и `range` —
		// массивы, и эхо модели тем же списком сменой не считается
		super(props)

		this._min = props.min ?? ctor.defaultValues.min
		this._max = props.max ?? ctor.defaultValues.max
		this._unavailable = props.unavailable ?? ctor.defaultValues.unavailable
		this._weekStart = props.weekStart ?? ctor.defaultValues.weekStart
		this._locale = props.locale ?? ctor.defaultValues.locale
		this._timeZone = props.timeZone ?? ctor.defaultValues.timeZone
		this._months = props.months ?? ctor.defaultValues.months
	}

	/** Невалидная строка границей не считается. */
	get min(): TCalendarDate | undefined {
		return this._min
	}

	set min(value: TCalendarDate | undefined) {
		if (this._min === value) return

		this._min = value
		this.events.emit('change:min', value)
	}

	/** Раньше `min` — граница схлопывается в `min`. */
	get max(): TCalendarDate | undefined {
		return this._max
	}

	set max(value: TCalendarDate | undefined) {
		if (this._max === value) return

		this._max = value
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

	/**
	 * Месяцы сеток. Как их показать — дни месяца, прижатие к границам, одна
	 * сетка на месяц — решает расширение `view` коллекции; оно же пишет сюда
	 * месяцы, которые показало, когда листают или уводят фокус.
	 */
	get months(): TCalendarDate[] | undefined {
		return this._months
	}

	/** Список сверяется поэлементно: эхо модели тем же списком — не смена. */
	set months(value: TCalendarDate[] | undefined) {
		if (sameValue(this._months, value)) return

		this._months = value
		this.events.emit('change:months', value)
	}

	/**
	 * Словарь строк библиотеки: календарь читает из него имена кнопок
	 * листания, а расширение `picker` — стрелок панели выбора месяца и года. Та
	 * же ссылка — ничего не меняет.
	 */
	get translations(): TTranslations {
		return this._translations
	}

	set translations(value: TTranslations) {
		if (this._translations === value) return

		this._translations = value
		this.events.emit('change:translations', value)
	}

	/**
	 * Имя кнопки «предыдущий месяц». Своего экземпляра у кнопки нет — набор
	 * отдаётся значением, как у кнопок ленты Scroller.
	 */
	get prevAria(): TAriaAttributes {
		return { 'aria-label': this._translations.calendar.prevMonth }
	}

	/** Имя кнопки «следующий месяц». */
	get nextAria(): TAriaAttributes {
		return { 'aria-label': this._translations.calendar.nextMonth }
	}

	get firstDay(): TWeekday {
		return isWeekday(this._weekStart) ? this._weekStart : calendarLocale(this._locale).firstDay
	}

	/**
	 * Дни недели от первого: узкое имя — подпись колонки, полное — для
	 * скринридера.
	 *
	 * Узкое, а не короткое: узкую форму CLDR задаёт под шапку календаря, в
	 * букву-две. Короткая у части локалей — целое слово (`ar` — «الخميس», `ml`
	 * — «വെള്ളി»), и колонке её не вместить. Узкие имена бывают одинаковыми
	 * (`S` и `S` у `en-US`): колонку называет её место, а имя дня скринридеру —
	 * полная дата. У `ur` и `sw` узкие имена в CLDR — латинские буквы
	 * (`S M T W T F S`), и подписи колонок у них такие же.
	 */
	get weekdays(): TCalendarWeekday[] {
		const locale = calendarLocale(this._locale)
		const first = this.firstDay

		return WEEK.map((offset) => {
			const day = weekdayOf(first + offset)

			return {
				narrow: locale.weekdayName(day, 'narrow'),
				long: locale.weekdayName(day, 'long'),
			}
		})
	}

	override getProps(): ICalendarProps {
		return {
			...super.getProps(),
			min: this._min,
			max: this._max,
			unavailable: this._unavailable,
			weekStart: this._weekStart,
			locale: this._locale,
			timeZone: this._timeZone,
			months: this._months,
		}
	}
}
