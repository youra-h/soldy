import type { IExtension, IExtensionItems } from '../types'
import type { TNoEvents } from '@soldy/core'
import type { IUniqueItemExtension } from './item/types'

/** Событий у расширения нет — см. `TNoEvents`. */
export type TUniqueEvents = TNoEvents

/** Контракт расширения уникальности. */
export interface IUniqueExtension<TItem extends object = any>
	extends IExtension<TItem, TUniqueEvents>, IExtensionItems<TItem, IUniqueItemExtension<TItem>> {
	/** Проверить, зарегистрирован ли элемент в коллекции. */
	has(item: TItem): boolean

	/** @inheritdoc IExtensionItems.createItem */
	createItem(owner: TItem): IUniqueItemExtension<TItem>
}
