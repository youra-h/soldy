import { withParts } from '@soldy-ui/setup'
import type { TClosedComponent } from '../../adapter'
import CalendarComponent from './Calendar.vue'
import { CalendarItem } from './item'

export { default as BaseCalendar } from './base.component'
export * from './base.component'
export * from './item'

/** Экземпляр владельца закрыт так же, как у частей (`TClosedComponent`). */
const CalendarOwner: TClosedComponent<typeof CalendarComponent> = CalendarComponent

/** Основная форма — `<Calendar.Item>`; плоский `CalendarItem` работает так же. */
export const Calendar = withParts(CalendarOwner, { Item: CalendarItem })
