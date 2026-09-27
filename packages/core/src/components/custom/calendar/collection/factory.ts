import { baseExtensions, assembleEngine } from '../../../base/collection/create/internal'
import type {
	TBaseExtensionSet,
	TOwnerExtensionSet,
} from '../../../base/collection/create/internal'
import TCalendarItem from '../item/item.class'
import type { ICalendarItem } from '../item/types'
import type { ICalendar } from '../types'
import {
	TCalendarFocusExtension,
	TCalendarSelectionExtension,
	TCalendarViewExtension,
} from './extensions'
import type { TCalendarCollection } from './types'

/**
 * Состав коллекции календаря — объявлением, как у ListBox.
 *
 * Базовый набор — хранилище дней: `plain`, `batch`, `order` и соседи, `factory`
 * строит `TCalendarItem` из даты. Стандартного выбора в нём нет: календарь
 * выбирает даты, а не элементы, и выбор у него свой.
 */
export const CALENDAR_EXTENSIONS = (): TBaseExtensionSet<ICalendarItem> => ({
	...baseExtensions<ICalendarItem>(TCalendarItem),
})

/**
 * То, чему нужен календарь. Порядок — порядок установки, и он значим:
 * расширения ставятся по одному, и то, что в `install` подписывается на
 * соседа, ставится после него. `focus` слушает `view`, `selection` — `focus`
 * (предпросмотр диапазона идёт до фокуса).
 */
export const CALENDAR_OWNER_EXTENSIONS: TOwnerExtensionSet<ICalendarItem, ICalendar> = {
	view: (owner) => new TCalendarViewExtension({ owner }),
	focus: (owner) => new TCalendarFocusExtension({ owner }),
	selection: (owner) => new TCalendarSelectionExtension({ owner }),
}

/** Полная коллекция календаря. Внутренняя: наружу ведёт `createEngineCalendar`. */
export const CalendarFactory = (owner: ICalendar): TCalendarCollection => {
	const engine = assembleEngine<ICalendarItem>(CALENDAR_EXTENSIONS())

	for (const build of Object.values(CALENDAR_OWNER_EXTENSIONS)) engine.use(build(owner))

	return engine
}
