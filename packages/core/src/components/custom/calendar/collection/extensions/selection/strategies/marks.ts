import type { TCalendarMarks } from './types'

/** Отметки дня вне выбора — и заполнителя соседнего месяца, который не выбирается вовсе. */
export const NO_MARKS: Readonly<TCalendarMarks> = {
	selected: false,
	rangeStart: false,
	rangeEnd: false,
	rangeMiddle: false,
	preview: false,
}
