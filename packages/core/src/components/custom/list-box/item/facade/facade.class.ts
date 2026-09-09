import { TSelectionItemFacade } from '../../../../base/collection'
import type { TItemContext } from '../../../../base/collection'
import type { TListBoxCollectionExtensions, TListBoxAdapters } from '../../collection/types'
import type { IListBoxItem } from '../types'
import type { TListBoxView } from '../../types'

/**
 * Фасад элемента списка.
 *
 * `selected` и `order` — из базы; своё — только `view`.
 *
 * `wordWrap` отсюда ушёл вместе с раскладкой: её свойства теперь у
 * `TListLayoutPlugin`, и `data-word-wrap` элементам он ставит сам. Шаблону
 * этот проп был нужен только ради того атрибута.
 */
export class TListBoxItemCollectionFacade extends TSelectionItemFacade<
	IListBoxItem,
	TListBoxCollectionExtensions
> {
	override setContext(context: TItemContext<IListBoxItem, TListBoxCollectionExtensions>): void {
		super.setContext(context)

		if (!this._context) return

		this.events.relay(this._listAdapters.list.events, ['change:view'])
	}

	get view(): TListBoxView {
		return this._context ? this._listAdapters.list.view : 'plain'
	}

	private get _listAdapters(): TListBoxAdapters {
		return this._context?.adapters as unknown as TListBoxAdapters
	}
}
