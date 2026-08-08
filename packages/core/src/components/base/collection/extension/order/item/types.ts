import type { IItemExtension } from '../../types'

/**
 * Контракт item-адаптера порядка.
 * Предоставляет readonly order — индекс элемента в коллекции.
 */
export interface IOrderItemExtension<TItem extends object = any>
	extends IItemExtension<TItem> {
	/** Порядковый номер элемента. Вычисляется на лету через indexOf. */
	readonly order: number
}
