/**
 * `<td is="so-calendar-item">` — день календаря: фокус и наборы — на ячейке (APG,
 * Date Picker Dialog), кнопки внутри нет. Рисует шаблон календаря, регистрирует
 * его модуль. docs/architecture.md, Layer 8d, «Даты».
 */

import { CalendarCollectionItemDescriptor, CalendarItemDescriptor } from '@soldy-ui/setup'
import type { ICalendarItem, TCalendarItemCollectionFacade } from '@soldy-ui/core'
import { ElementBase } from '../../../adapter'
import type { TElementClassOf, TElementType } from '../../../adapter'
import { calendarItemTemplate } from './calendar-item.template'
import { setupCalendarItem } from './setup.component'

export const TCalendarItemElement: TElementClassOf<
	typeof HTMLTableCellElement,
	typeof CalendarItemDescriptor,
	ICalendarItem,
	TCalendarItemCollectionFacade
> = ElementBase(HTMLTableCellElement, {
	descriptor: CalendarItemDescriptor,
	facade: CalendarCollectionItemDescriptor,
	template: calendarItemTemplate,
	setup: setupCalendarItem,
})

export type TCalendarItemElementProps = TElementType<typeof TCalendarItemElement>
