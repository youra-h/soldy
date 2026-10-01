import type { IExtension } from '../../../../../base/collection'
import type { TAria, TAriaAttributes, TCalendarDate } from '../../../../../../common'
import type { ICalendarItem } from '../../../item/types'
import type { ICalendar } from '../../../types'

/**
 * Ячейка сетки. День показанного месяца — элемент коллекции (`item`), его
 * наборы и текст у него самого. День соседнего месяца — заполнитель: элемента
 * у него нет (одна дата — один элемент, а при нескольких сетках хвост января —
 * это дни февраля), и рисовать в нём нечего: число повторило бы дату соседней
 * сетки. У заполнителя есть только набор ячейки.
 */
export type TCalendarCell = {
	/** Дата ячейки — ключ */
	date: TCalendarDate
	/** День месяца сетки; у заполнителя — `undefined` */
	item: ICalendarItem | undefined
	/** Набор заполнителя: скрыт от скринридера, иначе дата звучала бы дважды */
	aria: TAriaAttributes
}

/**
 * Наборы места сетки — то, что пишут в сетку снаружи вида: `id` заголовка и
 * ссылку сетки на него (`aria-labelledby`). Вид раскладывает их в
 * `TCalendarGrid` вместе со своим.
 */
export type TCalendarGridSets = {
	/** Заголовок месяца */
	title: TAria
	/** Таблица сетки */
	grid: TAria
}

/** Сетка месяца — выход для разметки. */
export type TCalendarGrid = {
	/** Первое число месяца — ключ */
	key: TCalendarDate
	/** Заголовок: месяц и год в календаре подписей локали */
	title: string
	/**
	 * Набор заголовка: `id` — от места сетки (пишет плагин связок), по нему
	 * сетку называет `aria-labelledby`; `aria-live="polite"` — смену месяца
	 * скринридер объявляет сам, анонсера у календаря нет
	 */
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
	/**
	 * Листание надо перечитать — `prevDisabled` и `nextDisabled`: сменились
	 * месяцы, границы (и тогда, когда месяцы остались на месте) или «выключен»
	 * календаря. Без аргумента: итог зависит от владельца, и событие значит
	 * «перечитай геттеры»
	 */
	'change:paging': () => void
}

/** Контракт расширения вида. */
export interface ICalendarViewExtension extends IExtension<ICalendarItem, TCalendarViewEvents> {
	/** Месяцы сеток — первые числа, без повторов, в границах */
	readonly months: TCalendarDate[]
	/** Сетки месяцев */
	readonly grids: TCalendarGrid[]
	/** Наборы заголовка и сетки на месте `index`: пишет в них плагин связок */
	gridSets(index: number): TCalendarGridSets
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

/**
 * Опции движка календаря: календарь приходит и уходит после сборки. Общие для
 * трёх расширений — вида, фокуса и выбора.
 */
export type TCalendarEngineOptions = {
	owner: ICalendar
}
