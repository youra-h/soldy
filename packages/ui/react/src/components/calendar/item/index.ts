/**
 * CalendarItem — день календаря на базе TCalendarItem и фасада элемента коллекции.
 */

// 1. Base (типы и пропсы)
export * from './base.component'

// 2. Setup (логика и хуки)
export { useSetupCalendarItem } from './setup.component'

// 3. View (JSX-шаблон)
export { CalendarItem } from './Item'
