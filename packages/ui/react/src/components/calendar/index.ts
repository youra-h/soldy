import { withParts } from '@soldy-ui/setup'
import { Calendar as CalendarComponent } from './Calendar'
import { CalendarItem } from './item'

export * from './base.component'
export * from './item'

/** Основная форма — `<Calendar.Item>`; плоский `CalendarItem` работает так же. */
export const Calendar = withParts(CalendarComponent, { Item: CalendarItem })
