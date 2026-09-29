import { createComponentEngine } from '../../../base/collection/create/internal'
import type { TCreateEngineOptions } from '../../../base'
import { calendarExtensions } from './factory'
import type { TCalendarCollection } from './types'
import type { ICalendar } from '../types'
import type { ICalendarItem } from '../item/types'

/**
 * Коллекция Calendar целиком. `owner` необязателен: без него детали владельца не
 * ставятся — их доставит `<Calendar>`, когда движок передадут компоненту.
 */
export function createEngineCalendar(
	options: TCreateEngineOptions<ICalendarItem> & { owner?: ICalendar } = {},
): TCalendarCollection {
	return createComponentEngine(calendarExtensions, options)
}
