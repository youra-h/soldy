import type { TCalendarDate } from '../../../../common'
import type { TCalendarValue } from '../types'

/** Отметки дня: что сетка показывает о выборе. */
export type TCalendarMarks = {
	/** День в показанном выборе: в значении или, пока стоит якорь, в предпросмотре */
	selected: boolean
	/** Первый день показанного диапазона */
	rangeStart: boolean
	/** Последний день показанного диапазона */
	rangeEnd: boolean
	/** День внутри показанного диапазона, не на его краю */
	rangeMiddle: boolean
	/** Показанный диапазон — предпросмотр: якорь стоит, второй конец не выбран */
	preview: boolean
}

/** Отметки дня по его дате — одна функция на чтение сетки. */
export type TCalendarMarker = (date: TCalendarDate) => TCalendarMarks

/** То, от чего считается выбор пользователя. */
export type TCalendarChoiceState = {
	/** Хранимое значение — как задано */
	raw: TCalendarValue
	/** Даты итога: валидные, без повторов, по возрастанию */
	dates: readonly TCalendarDate[]
	/** Якорь начатого диапазона */
	anchor: TCalendarDate | undefined
}

/** Итог выбора: что записать в значение и какой якорь оставить. */
export type TCalendarChoice = {
	/** Новое хранимое значение; выбор значения не меняет — то же `raw` */
	value: TCalendarValue
	/** Якорь после выбора */
	anchor: TCalendarDate | undefined
}

/**
 * Режим выбора — стратегия календаря: итог значения, выбор пользователя,
 * якорь и предпросмотр. Её меняет сеттер `mode`, и в методах календаря веток
 * по режиму нет.
 *
 * Стратегия без состояния: значение, якорь и указатель держит календарь и
 * отдаёт их в каждый вызов.
 */
export interface ICalendarSelection {
	/** Выбирают ли в сетке несколько дней — `aria-multiselectable` */
	readonly multiselectable: boolean
	/** Итог значения по его датам — валидным, без повторов, по возрастанию */
	resolve(dates: readonly TCalendarDate[]): TCalendarValue
	/** Выбор пользователя: дата уже проверена — в границах и доступна */
	choose(date: TCalendarDate, state: TCalendarChoiceState): TCalendarChoice
	/**
	 * Отметки дней. `dates` — даты итога, `anchor` — якорь начатого
	 * диапазона, `end` — второй конец предпросмотра: день под указателем, без
	 * указателя — фокус
	 */
	marker(
		dates: readonly TCalendarDate[],
		anchor: TCalendarDate | undefined,
		end: TCalendarDate,
	): TCalendarMarker
}

/** Конструктор стратегии: календарь заводит её на режим. */
export type TCalendarSelectionCtor = new () => ICalendarSelection
