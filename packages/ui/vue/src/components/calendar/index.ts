import { withParts } from '@soldy-ui/setup'
import CalendarComponent from './Calendar.vue'
import { CalendarItem } from './item'

export { default as BaseCalendar } from './base.component'
export * from './base.component'
export * from './item'

/** Основная форма — `<Calendar.Item>`; плоский `CalendarItem` работает так же. */
export const Calendar = withParts(CalendarComponent, { Item: CalendarItem })
