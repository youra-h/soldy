import type { ICalendarItem } from '@soldy-ui/core'

/** Кнопка листания календаря: «предыдущий месяц» или «следующий». */
export type TCalendarPager = 'prev' | 'next'

/** Стрелка панели выбора месяца и года: куда листает, место панели и её узел. */
export type TCalendarPickerArrow = {
	pager: TCalendarPager
	index: number
	panel: Element
}

/** День календаря и его узел — корень дня, ячейка сетки. */
export type TCalendarDay = {
	item: ICalendarItem
	element: Element
}
