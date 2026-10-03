import type { ICalendarItem } from '@soldy-ui/core'

/** Кнопка листания календаря: «предыдущий месяц» или «следующий». */
export type TCalendarPager = 'prev' | 'next'

/** Кнопка шапки панели выбора месяца и года: стрелка или кнопка уровня. */
export type TCalendarPickerPart = TCalendarPager | 'heading'

/** Кнопка шапки панели выбора, место панели и её узел. */
export type TCalendarPickerHit = {
	part: TCalendarPickerPart
	index: number
	panel: Element
}

/** День календаря и его узел — корень дня, ячейка сетки. */
export type TCalendarDay = {
	item: ICalendarItem
	element: Element
}
