import type {
	IValueControl,
	IValueControlProps,
	TValueControlEvents,
} from '../../base/value-control'
import type {
	TAriaAttributes,
	TCalendarDate,
	TDatasetAttributes,
	TDateUnit,
	TWeekday,
} from '../../../common'

/**
 * Режим выбора: одна дата, несколько разных дат или диапазон «от и до».
 * Режим — свойство календаря, а не отдельный компонент: сетка, фокус и
 * листание у всех трёх одни, различаются итог значения и выбор.
 */
export type TCalendarMode = 'single' | 'multiple' | 'range'

/** Диапазон дат: начало и конец по возрастанию; одна дата — однодневный диапазон. */
export type TCalendarRange = [TCalendarDate, TCalendarDate]

/**
 * Значение календаря. Форма — по режиму: `single` — дата или `undefined`,
 * `multiple` — даты по возрастанию без повторов, `range` — диапазон или
 * `undefined`.
 *
 * Хранится как задано, а итог отдаёт режим: так смена режима пересчитывает
 * итог, не трогая заданного. Строки не в формате даты выпадают из итога;
 * недоступные дни и дни вне границ остаются — это данные потребителя.
 */
export type TCalendarValue = TCalendarDate | TCalendarDate[] | TCalendarRange | undefined

/**
 * Недоступен ли день: `true` — фокус на день встаёт, но выбрать его нельзя, и
 * концом диапазона он не бывает. Диапазон через недоступный день проходит.
 *
 * `anchor` — якорь начатого диапазона, первый выбранный конец; диапазон не
 * начат — `undefined`. По нему потребитель выражает «не через занятые дни» и
 * «не дольше N ночей» той же функцией, без отдельных флагов.
 */
export type TCalendarUnavailable = (
	date: TCalendarDate,
	anchor: TCalendarDate | undefined,
) => boolean

/** Край недели: `start` — её первый день, `end` — последний. */
export type TCalendarWeekEdge = 'start' | 'end'

/** Заголовок колонки — день недели. */
export type TCalendarWeekday = {
	/** Короткое имя — подпись колонки (`Mon`) */
	short: string
	/** Полное имя — для скринридера (`Monday`, `abbr` у `<th>`) */
	long: string
}

/**
 * День сетки — выход ядра для разметки. Своего экземпляра у дня нет:
 * потребитель его не адресует, а число дней задаёт месяц (AGENTS.md, «Часть
 * или слот»). Поэтому наборы дня отдаются значением, как у ручки Slider.
 */
export type TCalendarDay = {
	/** Дата дня */
	date: TCalendarDate
	/** Номер дня в цифрах локали — текст ячейки */
	text: string
	/**
	 * По APG, Date Picker Dialog: одна ячейка с фокусом на весь календарь.
	 * `tabindex` — `0` у дня с фокусом и `-1` у прочих дней месяца, у дня вне
	 * границ и у выключенного календаря его нет; `aria-selected` (и `false`),
	 * `aria-disabled` — день нельзя выбрать, `aria-current="date"` — сегодня,
	 * `aria-label` — полная дата. День соседнего месяца — заполнитель: только
	 * `aria-hidden`, иначе при нескольких месяцах дата звучала бы дважды.
	 * Ключи у всех дней одни, отсутствующий атрибут — `null`
	 */
	aria: TAriaAttributes
	/**
	 * Факты для темы, `"true"` и `"false"`: `data-selected` — в показанном
	 * выборе, `data-today`, `data-outside-month` — заполнитель соседнего
	 * месяца, `data-out-of-bounds` — вне `min`/`max`, `data-unavailable`,
	 * `data-range-start`, `data-range-end` и `data-range-middle` — место в
	 * показанном диапазоне, `data-preview` — показан предпросмотр диапазона, а
	 * не значение
	 */
	dataset: TDatasetAttributes
}

/** Месяц — выход ядра для разметки. */
export type TCalendarMonth = {
	/** Первое число месяца — ключ */
	key: TCalendarDate
	/** Заголовок: месяц и год в календаре подписей локали */
	title: string
	/** `id` заголовка — от основы экземпляра и места месяца в блоке */
	titleAria: TAriaAttributes
	/**
	 * Сетка: `role="grid"`, имя — заголовок (`aria-labelledby`),
	 * `aria-multiselectable` в `multiple` и `range`
	 */
	gridAria: TAriaAttributes
	/** Недели по семь дней, от первого дня недели */
	weeks: TCalendarDay[][]
}

export type TCalendarEvents = TValueControlEvents<TCalendarValue> & {
	/** change:mode */
	'change:mode': (value: TCalendarMode) => void
	/** change:min */
	'change:min': (value: TCalendarDate | undefined) => void
	/** change:max */
	'change:max': (value: TCalendarDate | undefined) => void
	/** change:unavailable */
	'change:unavailable': (value: TCalendarUnavailable | undefined) => void
	/** change:weekStart */
	'change:weekStart': (value: TWeekday | undefined) => void
	/** change:locale */
	'change:locale': (value: string) => void
	/** change:timeZone */
	'change:timeZone': (value: string | undefined) => void
	/** change:numberOfMonths */
	'change:numberOfMonths': (value: number) => void
	/** Сменился первый показанный месяц — записью, листанием или уходом фокуса */
	'change:month': (value: TCalendarDate) => void
	/** Фокус сетки перешёл на другой день */
	'change:focusedDate': (value: TCalendarDate) => void
	/** Диапазон начат (дата — якорь) или закончен и отменён (`undefined`) */
	'change:anchor': (value: TCalendarDate | undefined) => void
	/** Указатель перешёл на другой день или ушёл с сетки (`undefined`) */
	'change:hoveredDate': (value: TCalendarDate | undefined) => void
}

export interface ICalendarProps extends IValueControlProps<TCalendarValue> {
	/** Режим выбора */
	mode?: TCalendarMode
	/** Первый день, который можно выбрать; раньше — ни фокуса, ни выбора */
	min?: TCalendarDate
	/** Последний день, который можно выбрать */
	max?: TCalendarDate
	/** Недоступные дни: фокус на них встаёт, выбор — нет */
	unavailable?: TCalendarUnavailable
	/** Первый день недели; не задан — по локали */
	weekStart?: TWeekday
	/** Локаль подписей и первого дня недели (BCP 47) */
	locale?: string
	/** Часовой пояс «сегодня» (IANA); не задан — пояс среды */
	timeZone?: string
	/** Сколько месяцев показано рядом */
	numberOfMonths?: number
	/** Дата, чей месяц показан первым; не задана — месяц фокуса */
	month?: TCalendarDate
}

export interface ICalendar extends IValueControl<TCalendarValue, ICalendarProps, TCalendarEvents> {
	/** Режим выбора */
	mode: TCalendarMode
	/** Первый день, который можно выбрать */
	min: TCalendarDate | undefined
	/** Последний день, который можно выбрать */
	max: TCalendarDate | undefined
	/** Недоступные дни */
	unavailable: TCalendarUnavailable | undefined
	/** Первый день недели; `undefined` — по локали */
	weekStart: TWeekday | undefined
	/** Локаль */
	locale: string
	/** Часовой пояс «сегодня» */
	timeZone: string | undefined
	/** Сколько месяцев показано рядом */
	numberOfMonths: number
	/**
	 * Первое число первого показанного месяца. Записать можно любую дату
	 * месяца, `undefined` — месяц фокуса
	 */
	get month(): TCalendarDate
	set month(value: TCalendarDate | undefined)
	/** День с фокусом сетки: всегда в границах и в показанных месяцах */
	readonly focusedDate: TCalendarDate
	/** Якорь начатого диапазона — первый выбранный конец */
	readonly anchor: TCalendarDate | undefined
	/** День под указателем */
	readonly hoveredDate: TCalendarDate | undefined
	/** Листать назад нельзя: показан месяц `min` или календарь выключен */
	readonly prevDisabled: boolean
	/** Листать вперёд нельзя: показан месяц `max` или календарь выключен */
	readonly nextDisabled: boolean
	/** Дни недели — заголовки колонок, от первого дня недели */
	readonly weekdays: TCalendarWeekday[]
	/** Показанные месяцы — выход для разметки */
	readonly months: TCalendarMonth[]
	/** Поставить фокус на дату; вне границ — на ближайшую границу */
	focusDate(date: TCalendarDate): void
	/** Сдвинуть фокус на `count` дней, недель, месяцев или лет */
	shiftFocus(unit: TDateUnit, count: number): void
	/** Поставить фокус на первый или последний день его недели */
	moveFocusToEdge(edge: TCalendarWeekEdge): void
	/** Показать предыдущий месяц — вид и фокус на месяц назад */
	showPrev(): void
	/** Показать следующий месяц */
	showNext(): void
	/**
	 * Выбор пользователя. `single` — заменить значение, `multiple` —
	 * переключить дату, `range` — первый выбор ставит якорь, второй пишет
	 * диапазон. Фокус встаёт на дату. `false` — день нельзя выбрать
	 */
	chooseDate(date: TCalendarDate): boolean
	/** Отменить начатый диапазон: снять якорь */
	cancelRange(): void
	/** День под указателем — для предпросмотра диапазона; ушёл с сетки — `undefined` */
	notifyHover(date: TCalendarDate | undefined): void
}
