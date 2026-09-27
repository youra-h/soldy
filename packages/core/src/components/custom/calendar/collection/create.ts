import { createComponentEngine } from '../../../base/collection/create/internal'
import type { TCreateEngineOptions } from '../../../base'
import { CALENDAR_EXTENSIONS, CALENDAR_OWNER_EXTENSIONS } from './factory'
import type { TCalendarCollection } from './types'
import type { ICalendar } from '../types'
import type { ICalendarItem } from '../item/types'

/**
 * Коллекция календаря целиком. `owner` обязателен: дни, выбор и фокус
 * держатся на календаре. `items` не нужен — дни кладёт вид по месяцам сеток.
 */
export function createEngineCalendar(
	options: TCreateEngineOptions<ICalendarItem> & { owner: ICalendar },
): TCalendarCollection {
	return createComponentEngine(
		'createEngineCalendar',
		CALENDAR_EXTENSIONS(),
		CALENDAR_OWNER_EXTENSIONS,
		options,
	)
}
