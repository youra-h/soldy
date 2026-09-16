import type { IExtension, IExtensionItems } from '../types'
import type { IUniqueItemExtension } from './item/types'

/**
 * Событий у расширения нет.
 *
 * Пустой объект, а не `Record<string, never>`: у второго есть индексная
 * сигнатура, и «событий нет» читается проверкой `relay` как «любое имя
 * подойдёт». Пустая карта не пропускает ни одного.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type TUniqueEvents = {}

/** Контракт расширения уникальности. */
export interface IUniqueExtension<TItem extends object = any>
	extends IExtension<TItem, TUniqueEvents>, IExtensionItems<TItem, IUniqueItemExtension<TItem>> {
	/** Проверить, зарегистрирован ли элемент в коллекции. */
	has(item: TItem): boolean

	/** @inheritdoc IExtensionItems.createItem */
	createItem(owner: TItem): IUniqueItemExtension<TItem>
}
