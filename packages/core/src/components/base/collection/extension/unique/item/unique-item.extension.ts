import type { TUniqueExtension } from '../unique.extension'
import type { IUniqueItemExtension, TUniqueItemEventsExtension } from './types'
import { TBaseItemExtension } from '../../base-item-extension.class'

/**
 * TUniqueItemExtension — stateless-делегат элемента для проверки уникальности.
 *
 * Не хранит состояние, ссылается на родительский TUniqueExtension.
 *
 * @template TItem — тип элемента (пользователь может расширить)
 */
export class TUniqueItemExtension<TItem extends object = any>
	extends TBaseItemExtension<TItem, TUniqueExtension<TItem>, TUniqueItemEventsExtension>
	implements IUniqueItemExtension<TItem>
{
	constructor(item: TItem, parent: TUniqueExtension<TItem>) {
		super(item, parent)
	}

	/** Есть ли элемент в коллекции. Вычисляется на лету через родительский TUniqueExtension. */
	get exists(): boolean {
		return this._parent.has(this._item)
	}
}
