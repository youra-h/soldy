import { TBaseItemExtension } from '../../../../base/collection'
import type { ITabItemExtension } from './types'
import type { ITabItem } from '../../tab-item/types'

/**
 * TTabItemExtension — stateless-делегат элемента таба.
 *
 * Предоставляет closable, резолвя его из элемента (приоритет) или
 * родительского расширения (fallback на TTabs.closable).
 *
 * @template TItem   — тип элемента (ITabItem или наследник)
 * @template TParent — тип родительского расширения (обычно TTabsExtension)
 */
export class TTabItemExtension<TItem extends ITabItem = ITabItem, TParent = any>
	extends TBaseItemExtension<TItem, TParent>
	implements ITabItemExtension<TItem>
{
	/**
	 * Может ли таб быть закрыт.
	 * Явное значение элемента > глобальное значение из расширения.
	 */
	get closable(): boolean {
		return this._owner.closable ?? (this._parent as any).closable
	}

	close(): void {
		if (this.closable) {
			this._parent.closeTab(this._owner)
		}
	}
}
