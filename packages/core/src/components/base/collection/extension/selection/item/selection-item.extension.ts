import type { TSelectionExtension } from '../selection.extension'
import type { ISelectionItemExtension } from './types'
import { TBaseItemExtension } from '../../base-item-extension.class'

/**
 * TSelectionItemExtension — stateless-делегат элемента для управления выборкой.
 *
 * Не хранит состояние, ссылается на родительский TSelectionExtension.
 *
 * @template TItem — тип элемента (пользователь может расширить)
 */
export class TSelectionItemExtension<TItem extends object = any>
	extends TBaseItemExtension<TItem, TSelectionExtension<TItem>>
	implements ISelectionItemExtension<TItem>
{
	/** Выбран ли элемент. Вычисляется на лету через родительский TSelectionExtension. */
	get selected(): boolean {
		return this._parent.isSelected(this._item)
	}

	/** Установить выбор элемента. Делегирует в родительский TSelectionExtension. */
	set selected(value: boolean) {
		if (value) {
			this._parent.select(this._item)
		} else {
			this._parent.deselect(this._item)
		}
	}

	/** Переключить выбор элемента. */
	toggle(): void {
		this._parent.toggle(this._item)
	}
}
