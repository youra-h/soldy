import type { IItemExtension } from '../../types'

/** События item-адаптера порядка. */
export type TOrderItemEvents = {
	'change:order': () => void
}

/**
 * Контракт item-адаптера порядка.
 * Предоставляет readonly order — индекс элемента в коллекции.
 */
export interface IOrderItemExtension<TItem extends object = any> extends IItemExtension<
	TItem,
	TOrderItemEvents
> {
	/** Порядковый номер элемента. Вычисляется на лету через indexOf. */
	readonly order: number
}
