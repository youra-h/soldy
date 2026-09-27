import type { IExtension } from '../../../../../base/collection'
import type { TAriaAttributes, TCalendarDate, TDatasetAttributes } from '../../../../../../common'
import type { ICalendarItem } from '../../../item/types'
import type { ICalendar } from '../../../types'

/**
 * Ячейка сетки. День показанного месяца — элемент коллекции (`item`), его
 * наборы у него самого. День соседнего месяца — заполнитель: элемента у него
 * нет (одна дата — один элемент, а при нескольких сетках хвост января — это
 * дни февраля), и наборы ячейки отдаются здесь.
 */
export type TCalendarCell = {
	/** Дата ячейки — ключ */
	date: TCalendarDate
	/** День месяца сетки; у заполнителя — `undefined` */
	item: ICalendarItem | undefined
	/** Номер дня в цифрах локали — текст заполнителя */
	text: string
	/** Наборы заполнителя: скрыт от скринридера, иначе дата звучала бы дважды */
	aria: TAriaAttributes
	/** Факты заполнителя для темы: `data-outside-month` */
	dataset: TDatasetAttributes
}

/** Сетка месяца — выход для разметки. */
export type TCalendarGrid = {
	/** Первое число месяца — ключ */
	key: TCalendarDate
	/** Заголовок: месяц и год в календаре подписей локали */
	title: string
	/** `id` заголовка — от основы календаря и места сетки */
	titleAria: TAriaAttributes
	/**
	 * Сетка: `role="grid"`, имя — заголовок (`aria-labelledby`),
	 * `aria-multiselectable`, когда выбирают несколько дней
	 */
	gridAria: TAriaAttributes
	/** Недели по семь ячеек, от первого дня недели */
	weeks: TCalendarCell[][]
}

export type TCalendarViewEvents = {
	/** Сменились месяцы сеток; `previous` — прежние, по ним фокус едет со своей сеткой */
	'change:months': (months: TCalendarDate[], previous: TCalendarDate[]) => void
	/**
	 * Сетки надо перечитать: месяцы, первый день недели или подписи. Режим
	 * выбора (`aria-multiselectable`) сообщает своё `change:mode` расширения
	 * выбора — вид ставится раньше него и подписаться на него не может
	 */
	'change:grids': () => void
}

/** Контракт расширения вида. */
export interface ICalendarViewExtension extends IExtension<ICalendarItem, TCalendarViewEvents> {
	/** Месяцы сеток — первые числа, без повторов, в границах */
	readonly months: TCalendarDate[]
	/** Сетки месяцев */
	readonly grids: TCalendarGrid[]
	/** Листать назад нельзя: самая ранняя сетка на месяце `min` или календарь выключен */
	readonly prevDisabled: boolean
	/** Листать вперёд нельзя: самая поздняя сетка на месяце `max` или календарь выключен */
	readonly nextDisabled: boolean
	/** Сдвинуть все сетки на месяц назад */
	showPrev(): void
	/** Сдвинуть все сетки на месяц вперёд */
	showNext(): void
	/** Показать в сетке `index` месяц даты; месяц уже в другой сетке — сетки меняются местами */
	showMonth(index: number, month: TCalendarDate): void
	/**
	 * Показать месяц даты, если он не показан: все сетки сдвигаются на столько
	 * месяцев, на сколько дата ушла от месяца `from`. Сдвиг вывел бы сетку за
	 * границы — месяц даты встаёт только в сетку `from`
	 */
	reveal(date: TCalendarDate, from: TCalendarDate): void
}

/** Опции конструктора: ссылка на календарь. */
export interface ICalendarViewExtensionOptions {
	owner: ICalendar
}
