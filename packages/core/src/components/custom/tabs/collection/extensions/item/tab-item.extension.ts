import { TBaseItemExtension } from '../../../../../base/collection'
import type { ITabItemExtension, TTabItemEventsExtension } from './types'
import type { ITabItem } from '../../../tab-item/types'
import type { ITabsExtension } from '../types'

/**
 * TTabItemExtension — stateless-делегат элемента таба.
 *
 * Предоставляет closable, резолвя его из элемента (приоритет) или
 * родительского расширения (fallback на TTabs.closable).
 *
 * @template TItem   — тип элемента (ITabItem или наследник)
 * @template TParent — тип родительского расширения (ITabsExtension или наследник)
 */
export class TTabItemExtension<
	TItem extends ITabItem = ITabItem,
	TParent extends ITabsExtension<TItem> = ITabsExtension<TItem>,
>
	extends TBaseItemExtension<TItem, TParent, TTabItemEventsExtension>
	implements ITabItemExtension<TItem>
{
	constructor(item: TItem, parent: TParent) {
		super(item, parent)

		this.events.relay(parent.events, ['change:closable'])
		this.events.relay(item.events, ['change:closable'])
	}

	/**
	 * Может ли таб быть закрыт.
	 * Явное значение элемента > глобальное значение из расширения.
	 */
	get closable(): boolean {
		return this._item.closable ?? this._parent.closable
	}

	/**
	 * Закрыть таб.
	 * Делегирует в родительское расширение.
	 */
	close(): void {
		if (this.closable) {
			this._parent.closeTab(this._item)
		}
	}
}
