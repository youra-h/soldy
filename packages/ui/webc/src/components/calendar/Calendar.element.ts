/**
 * `<div is="so-calendar">` — календарь; дни рисует шаблон, слота по умолчанию
 * нет. Модуль регистрирует и день. docs/architecture.md, Layer 8d, «Даты».
 */

import { CalendarCollectionDescriptor, CalendarDescriptor } from '@soldy-ui/setup'
import type { ICalendar, TCalendarCollectionFacade } from '@soldy-ui/core'
import { ElementBase, defineElement } from '../../adapter'
import type { TElementClassOf, TElementType } from '../../adapter'
import { calendarTemplate } from './calendar.template'
import { TCalendarItemElement } from './item'
import { setupCalendar } from './setup.component'

export const TCalendarElement: TElementClassOf<
	typeof HTMLDivElement,
	typeof CalendarDescriptor,
	ICalendar,
	TCalendarCollectionFacade
> = ElementBase(HTMLDivElement, {
	descriptor: CalendarDescriptor,
	facade: CalendarCollectionDescriptor,
	template: calendarTemplate,
	setup: setupCalendar,
})

defineElement('so-calendar', TCalendarElement, 'div')
defineElement('so-calendar-item', TCalendarItemElement, 'td')

export type TCalendarElementProps = TElementType<typeof TCalendarElement>
