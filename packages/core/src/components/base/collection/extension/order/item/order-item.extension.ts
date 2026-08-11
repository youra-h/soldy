import type { TOrderExtension } from '../order.extension'
import type { IOrderItemExtension } from './types'
import { TBaseItemExtension } from '../../base-item-extension.class'

/**
 * TOrderItemExtension — stateless-делегат элемента для доступа к order.
 *
 * Не хранит состояние, ссылается на родительский TOrderExtension.
 *
 * @template TItem — тип элемента (пользователь может расширить)
 */
export class TOrderItemExtension<TItem extends object = any>
	extends TBaseItemExtension<TItem, TOrderExtension<TItem>>
	implements IOrderItemExtension<TItem>
{
	/**
	 * Порядковый номер элемента в коллекции.
	 * Вычисляется на лету через родительский TOrderExtension.
	 */
	get order(): number {
		return this._parent.getItemOrder(this._item)
	}
}
