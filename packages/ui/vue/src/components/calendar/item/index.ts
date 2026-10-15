import type { TClosedComponent } from '../../../adapter'
import CalendarItemComponent from './Item.vue'

export * from './base.component'
export { default as BaseCalendarItem } from './base.component'

export const CalendarItem: TClosedComponent<typeof CalendarItemComponent> = CalendarItemComponent
