import type { TActivationExtension } from '../activation.extension'

/**
 * TActivationItemExtension — stateless-делегат элемента для управления активностью.
 *
 * Не хранит состояние, ссылается на родительский TActivationExtension.
 *
 * @template TItem — тип элемента (пользователь может расширить)
 */
export class TActivationItemExtension<TItem extends object = any> {
	constructor(
		private readonly _owner: TItem,
		private readonly _parent: TActivationExtension<TItem>,
	) {}

	/**
	 * Активен ли элемент.
	 * Вычисляется на лету через родительский TActivationExtension.
	 */
	get active(): boolean {
		return this._parent.isActive(this._owner)
	}

	/**
	 * Установить активность элемента.
	 * Делегирует в родительский TActivationExtension.
	 */
	set active(value: boolean) {
		if (value) {
			this._parent.activate(this._owner)
		} else {
			this._parent.deactivate(this._owner)
		}
	}
}
