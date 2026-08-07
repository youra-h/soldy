import type { TSelectionExtension } from '../selection.extension'

/**
 * TSelectionItemExtension — stateless-делегат элемента для управления выборкой.
 *
 * Не хранит состояние, ссылается на родительский TSelectionExtension.
 *
 * @template TItem — тип элемента (пользователь может расширить)
 */
export class TSelectionItemExtension<TItem extends object = any> {
	constructor(
		private readonly _owner: TItem,
		private readonly _parent: TSelectionExtension<TItem>,
	) {}

	/** Выбран ли элемент. Вычисляется на лету через родительский TSelectionExtension. */
	get selected(): boolean {
		return this._parent.isSelected(this._owner)
	}

	/** Установить выбор элемента. Делегирует в родительский TSelectionExtension. */
	set selected(value: boolean) {
		if (value) {
			this._parent.select(this._owner)
		} else {
			this._parent.deselect(this._owner)
		}
	}

	/** Переключить выбор элемента. */
	toggle(): void {
		this._parent.toggle(this._owner)
	}
}
