import type { TActivationExtension } from '../activation.extension'
import type { IActivationItemExtension, TActivationItemEventsExtension } from './types'
import { TBaseItemExtension } from '../../base-item-extension.class'

/**
 * TActivationItemExtension — stateless-делегат элемента для управления активностью.
 *
 * Не хранит состояние, ссылается на родительский TActivationExtension.
 *
 * @template TItem — тип элемента (пользователь может расширить)
 */
export class TActivationItemExtension<TItem extends object = any>
	extends TBaseItemExtension<TItem, TActivationExtension<TItem>, TActivationItemEventsExtension>
	implements IActivationItemExtension<TItem>
{
	constructor(item: TItem, parent: TActivationExtension<TItem>) {
		super(item, parent)

		this.events.relay(parent.events, [
			{
				from: 'change:activation',
				as: 'change:active',
			},
		])
	}

	/**
	 * Активен ли элемент.
	 * Вычисляется на лету через родительский TActivationExtension.
	 */
	get active(): boolean {
		return this._parent.isActive(this._item)
	}

	/**
	 * Установить активность элемента.
	 * Делегирует в родительский TActivationExtension.
	 */
	set active(value: boolean) {
		if (value) {
			this._parent.activate(this._item)
		} else {
			this._parent.deactivate(this._item)
		}
	}
}
