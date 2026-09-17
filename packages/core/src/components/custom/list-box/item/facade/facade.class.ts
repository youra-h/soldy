import { TSelectionItemFacade } from '../../../../base/collection'
import type { TItemContext } from '../../../../base/collection'
import type {
	TListBoxCollectionExtensions,
	TListBoxItemCollectionFacadeEvents,
} from '../../collection/types'
import type { IListBoxItem } from '../types'
import type { TListBoxView } from '../../types'
import { LIST_DEFAULTS } from '../../../list'
import type { TListIndicator } from '../../../list'

/**
 * Фасад элемента списка.
 *
 * `selected` и `order` — из базы; своё — `view` и `indicator`.
 *
 * `wordWrap` отсюда ушёл: шаблону этот проп был нужен только ради атрибута
 * `data-word-wrap`, а его преемника `data-content-fit` элементам ставит
 * `TListBoxExtension`.
 */
export class TListBoxItemCollectionFacade extends TSelectionItemFacade<
	IListBoxItem,
	TListBoxCollectionExtensions,
	TListBoxItemCollectionFacadeEvents
> {
	override setContext(context: TItemContext<IListBoxItem, TListBoxCollectionExtensions>): void {
		super.setContext(context)

		if (!this._context) return

		this.events.relayAll(this._context.adapters.list.events)
	}

	get view(): TListBoxView | undefined {
		return this._context?.adapters.list.view
	}

	/**
	 * Сторона отметки выбранного. Значение одно на весь список и читается у
	 * него: элемент своей стороны не имеет. Меняется только на инстансе списка —
	 * как `view`.
	 */
	get indicator(): TListIndicator {
		return this._context?.adapters.list.indicator ?? LIST_DEFAULTS.indicator
	}
}
