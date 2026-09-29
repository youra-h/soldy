import { baseExtensions } from '../../../base/collection/create/internal'
import type { TExtensionSet } from '../../../base/collection/create/internal'
import TCalendarItem from '../item/item.class'
import type { ICalendarItem } from '../item/types'
import type { ICalendar } from '../types'
import {
	TCalendarFocusExtension,
	TCalendarSelectionExtension,
	TCalendarViewExtension,
} from './extensions'

/**
 * Детали рабочей коллекции календаря — по порядку установки. См. `tabsExtensions`.
 *
 * Базовые детали — хранилище дней: `plain`, `batch`, `order` и соседи, `factory`
 * строит `TCalendarItem` из даты. Стандартного выбора в нём нет: календарь
 * выбирает даты, а не элементы, и выбор у него свой.
 *
 * Порядок значим: то, что в `install` подписывается на соседа, ставится после
 * него. `focus` слушает `view`, `selection` — `focus` (предпросмотр диапазона
 * идёт до фокуса).
 */
export function calendarExtensions(owner?: ICalendar): TExtensionSet<ICalendarItem> {
	const set = baseExtensions<ICalendarItem>(TCalendarItem)

	if (owner) {
		set.view = () => new TCalendarViewExtension({ owner })
		set.focus = () => new TCalendarFocusExtension({ owner })
		set.selection = () => new TCalendarSelectionExtension({ owner })
	}

	return set
}
