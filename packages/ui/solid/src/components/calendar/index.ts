import { withParts } from '@soldy-ui/setup'
import { Calendar as CalendarComponent } from './Calendar'
import { CalendarItem } from './item'

export * from './base.component'
export { setupCalendar } from './setup.component'
export * from './item'

export const Calendar = withParts(CalendarComponent, { Item: CalendarItem })
