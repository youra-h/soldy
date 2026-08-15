import type { IItemExtension, TBaseItemEventsExtension } from '../../types'

/** События item-адаптера уникальности. */
export type TUniqueItemEventsExtension = TBaseItemEventsExtension

/**
 * Контракт item-адаптера уникальности.
 * Предоставляет геттер exists — делегирует в родительский TUniqueExtension.
 */
export interface IUniqueItemExtension<TItem extends object = any>
	extends IItemExtension<TItem, TUniqueItemEventsExtension> {
	/** Есть ли элемент в коллекции (не дубликат). */
	readonly exists: boolean
}
