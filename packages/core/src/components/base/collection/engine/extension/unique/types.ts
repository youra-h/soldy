import type { IExtension, IExtensionItems } from '../types'
import type { IUniqueItemExtension } from './item/types'

/** События расширения уникальности (собственных событий нет). */
export type TUniqueEvents = Record<string, never>

/** Контракт расширения уникальности. */
export interface IUniqueExtension<TItem extends object = any>
	extends IExtension<TItem, TUniqueEvents>, IExtensionItems<TItem, IUniqueItemExtension<TItem>> {
	/** Проверить, зарегистрирован ли элемент в коллекции. */
	has(item: TItem): boolean

	/** @inheritdoc IExtensionItems.createItem */
	createItem(owner: TItem): IUniqueItemExtension<TItem>
}
