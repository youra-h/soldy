import type { TOrderExtension } from '../order.extension'

/**
 * TOrderItemExtension — stateless-делегат элемента для доступа к order.
 *
 * Не хранит состояние, ссылается на родительский TOrderExtension.
 *
 * @template TItem — тип элемента (пользователь может расширить)
 */
export class TOrderItemExtension<TItem extends object = any> {
	constructor(
		private readonly _owner: TItem,
		private readonly _parent: TOrderExtension<TItem>,
	) {}

	/**
	 * Порядковый номер элемента в коллекции.
	 * Вычисляется на лету через родительский TOrderExtension.
	 */
	get order(): number {
		return this._parent.getItemOrder(this._owner)
	}
}
