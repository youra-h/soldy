import type { ICalendarItem } from '@soldy-ui/core'

/** Кнопка листания календаря: «предыдущий месяц» или «следующий». */
export type TCalendarPager = 'prev' | 'next'

/** День календаря и его узел — корень дня, ячейка сетки. */
export type TCalendarDay = {
	item: ICalendarItem
	element: Element
}
