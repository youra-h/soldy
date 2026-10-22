/**
 * Calendar — сетки месяцев на базе TCalendar и коллекции дней.
 *
 * День — часть `Calendar.Item`: дни кладёт в коллекцию вид календаря по
 * месяцам сеток, а содержимое дня приложение задаёт слотом `item`.
 */

import { withParts } from '@soldy-ui/setup'
import CalendarComponent from './Calendar.svelte'
import { CalendarItem } from './item'

export * from './base.component'
export { setupCalendar } from './setup.component'
export * from './item'

/** Основная форма — `<Calendar.Item>`; плоский `CalendarItem` работает так же. */
export const Calendar = withParts(CalendarComponent, { Item: CalendarItem })
