/**
 * Общая часть работы со слотами.
 *
 * Имена слотов НЕ преобразуются под фреймворк — в этом и смысл контракта:
 * `leading` остаётся `leading` везде. Исключение ровно одно — слот по
 * умолчанию: во Vue он называется `default`, в React/Solid/Svelte это
 * `children`, в Angular и Web Components — безымянный слот.
 */

import type { IComponentDescriptor } from '../descriptors'

/** Каноническое имя слота по умолчанию в контракте. */
export const DEFAULT_SLOT = 'default'

/**
 * Имя слота в терминах конкретного адаптера.
 *
 *   resolveSlotName('leading', 'children') → 'leading'
 *   resolveSlotName('default', 'children') → 'children'
 */
export function resolveSlotName(name: string, defaultName: string): string {
	return name === DEFAULT_SLOT ? defaultName : name
}

/** Есть ли у слота scope, то есть передаются ли внутрь данные. */
export function isScopedSlot(scope: Record<string, any> | undefined): boolean {
	return !!scope && Object.keys(scope).length > 0
}

/**
 * Имена слотов дескриптора — для conformance-проверок и кодогенерации.
 * `defaultName` подставляется вместо `default`, если адаптеру это нужно.
 */
export function slotNames(descriptor: IComponentDescriptor, defaultName?: string): string[] {
	return descriptor
		.getSlots()
		.map((slot) => (defaultName ? resolveSlotName(slot.name, defaultName) : slot.name))
}
