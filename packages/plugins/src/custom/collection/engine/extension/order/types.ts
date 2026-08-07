import type { IExtension, IExtensionItems } from '../types'
import type { TEvented } from '@soldy/core'
import type { IOrderItemExtension } from './item/types'

export type TOrderEvents = {
	'change:order': () => void
}

/** Контракт расширения порядка. Реализуется TOrderExtension. */
export interface IOrderExtension<TItem extends object = any>
	extends IExtension<TItem>, IExtensionItems<TItem, IOrderItemExtension<TItem>> {
	/** События расширения: change:order. */
	readonly events: TEvented<TOrderEvents>

	/**
	 * Возвращает актуальный индекс элемента в коллекции.
	 * Вычисляется через indexOf — не кэшируется.
	 */
	getItemOrder(item: TItem): number

	/** @inheritdoc IExtensionItems.createItem */
	createItem(owner: TItem): IOrderItemExtension<TItem>
}
