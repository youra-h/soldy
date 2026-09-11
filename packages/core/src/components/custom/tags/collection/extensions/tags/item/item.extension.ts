import { TBaseItemExtension } from '../../../../../../base/collection'
import type { ITagsItemExtension, TTagsItemEventsExtension } from './types'
import type { ITagsItem } from '../../../../item/types'
import type { ITagsExtension } from '../types'

/**
 * TTagsItemExtension — stateless-делегат элемента тега.
 *
 * Копия `TTabsItemExtension`: closable резолвится из элемента (приоритет) или
 * родительского расширения (fallback на `TTags.closable`).
 *
 * @template TItem   — тип элемента (ITagsItem или наследник)
 * @template TParent — тип родительского расширения (ITagsExtension или наследник)
 */
export class TTagsItemExtension<
	TItem extends ITagsItem = ITagsItem,
	TParent extends ITagsExtension<TItem> = ITagsExtension<TItem>,
>
	extends TBaseItemExtension<TItem, TParent, TTagsItemEventsExtension>
	implements ITagsItemExtension<TItem>
{
	constructor(item: TItem, parent: TParent) {
		super(item, parent)

		this.events.relay(parent.events, ['change:closable'])
		this.events.relay(item.events, ['change:closable'])
	}

	/**
	 * Можно ли закрыть тег.
	 * Явное значение элемента > глобальное значение из расширения.
	 */
	get closable(): boolean {
		return this._item.closable ?? this._parent.closable
	}

	/**
	 * Закрыть тег.
	 * Делегирует в родительское расширение.
	 */
	close(): void {
		if (this.closable) {
			this._parent.closeTag(this._item)
		}
	}
}
