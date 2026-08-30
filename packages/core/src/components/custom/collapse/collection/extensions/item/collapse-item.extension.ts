import { TBaseItemExtension } from '../../../../../base/collection'
import type { ICollapseItemExtension, TCollapseItemEventsExtension } from './types'
import type { ICollapseItem } from '../../../collapse-item/types'
import type { ICollapseExtension } from '../types'

/**
 * TCollapseItemExtension — stateless-делегат элемента collapse.
 *
 * Предоставляет view, резолвя его из родительского расширения (TCollapse.view).
 *
 * @template TItem   — тип элемента (ICollapseItem или наследник)
 * @template TParent — тип родительского расширения (ICollapseExtension или наследник)
 */
export class TCollapseItemExtension<
	TItem extends ICollapseItem = ICollapseItem,
	TParent extends ICollapseExtension<TItem> = ICollapseExtension<TItem>,
>
	extends TBaseItemExtension<TItem, TParent, TCollapseItemEventsExtension>
	implements ICollapseItemExtension<TItem>
{
	constructor(item: TItem, parent: TParent) {
		super(item, parent)

		this.events.relay(parent.events, ['change:view'])
	}

	/**
	 * Внешний вид элемента.
	 * Берётся из родительского расширения (TCollapse).
	 */
	get view(): string {
		return this._parent.view
	}
}
