import { TBaseItemExtension } from '../../../../../../base/collection'
import type { IMenuItemExtension, TMenuItemEventsExtension } from './types'
import type { IMenuItem } from '../../../../item/types'
import type { IMenuExtension } from '../types'

/**
 * TMenuItemExtension — stateless-делегат пункта меню.
 *
 * Нажатие своего пункта передаёт родительскому расширению: выключенному
 * пункту откажет оно, и проверка одна на клик и на клавиатуру — клавиши
 * строки клик и делают (`TActionPlugin`).
 *
 * @template TItem   — тип пункта (IMenuItem или наследник)
 * @template TParent — тип родительского расширения (IMenuExtension или наследник)
 */
export class TMenuItemExtension<
	TItem extends IMenuItem = IMenuItem,
	TParent extends IMenuExtension<TItem, any> = IMenuExtension<TItem>,
	TEvents extends TMenuItemEventsExtension = TMenuItemEventsExtension,
>
	extends TBaseItemExtension<TItem, TParent, TEvents>
	implements IMenuItemExtension<TItem, TEvents>
{
	/** Нажатие пункта-действия: решает меню — выполнить и закрыться или отказать. */
	choose(): void {
		this._parent.chooseItem(this._item)
	}

	/** Нажатие флажка: решает меню — переключить отметку или отказать. */
	toggle(): void {
		this._parent.toggleItem(this._item)
	}
}
