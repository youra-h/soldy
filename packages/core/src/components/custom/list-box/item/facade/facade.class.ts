import { TSelectionItemFacade } from '../../../../base/collection'
import type { TItemContext } from '../../../../base/collection'
import type {
	TListBoxCollectionExtensions,
	TListBoxItemCollectionFacadeEvents,
} from '../../collection/types'
import type { IListBoxItem } from '../types'
import { LIST_DEFAULTS } from '../../../list'
import type { TListIndicator } from '../../../list'

/**
 * Фасад элемента списка.
 *
 * `selected` и `order` — из базы; своё — `indicator`.
 *
 * `view` отсюда ушёл: вид списка расширение коллекции пишет самому элементу,
 * как `size` и `variant`, и разметка читает его у элемента, а элемент — пишет
 * своей строке. Фасад отдавал то же значение вторым путём.
 *
 * `wordWrap` отсюда ушёл раньше: шаблону этот проп был нужен только ради
 * атрибута `data-word-wrap`, а его преемника `data-content-fit` элементам
 * ставит `TListBoxExtension`.
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

	/**
	 * Сторона отметки выбранного. Значение одно на весь список и читается у
	 * него: элемент своей стороны не имеет. Меняется только на инстансе списка.
	 */
	get indicator(): TListIndicator {
		return this._context?.adapters.list.indicator ?? LIST_DEFAULTS.indicator
	}
}
