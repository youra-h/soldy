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
 * Расширения коллекции календаря — всё, без чего компонент не работает.
 *
 * Базовая часть — хранилище дней: `plain`, `batch`, `order` и соседи,
 * `factory` строит `TCalendarItem` из даты. Стандартного выбора в нём нет:
 * календарь выбирает даты, а не элементы, и выбор у него свой.
 *
 * Порядок — порядок установки, и он значим: расширения ставятся по одному, и
 * то, что в `install` подписывается на соседа, ставится после него. `focus`
 * слушает `view`, `selection` — `focus` (предпросмотр диапазона идёт до фокуса).
 */
export const CALENDAR_EXTENSIONS = (): TExtensionSet<ICalendarItem, ICalendar> => ({
	...baseExtensions<ICalendarItem>(TCalendarItem),
	view: (owner) => new TCalendarViewExtension({ owner }),
	focus: (owner) => new TCalendarFocusExtension({ owner }),
	selection: (owner) => new TCalendarSelectionExtension({ owner }),
})
