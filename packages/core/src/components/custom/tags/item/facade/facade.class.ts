import { TSelectionItemFacade } from '../../../../base/collection'
import type { TItemContext } from '../../../../base/collection'
import type {
	TTagsCollectionExtensions,
	TTagsItemCollectionFacadeEvents,
} from '../../collection/types'
import type { ITagsItem } from '../types'

/**
 * Фасад элемента Tags.
 *
 * `selected` и `order` — из базы (`TSelectionItemFacade`). Своё — только
 * `tag_closable`.
 */
export class TTagsItemCollectionFacade extends TSelectionItemFacade<
	ITagsItem,
	TTagsCollectionExtensions,
	TTagsItemCollectionFacadeEvents
> {
	override setContext(context: TItemContext<ITagsItem, TTagsCollectionExtensions>): void {
		super.setContext(context)

		if (!this._context) return

		this.events.relayAll(this._context.adapters.tags.events)
	}

	/**
	 * Можно ли закрыть тег — итог item-адаптера `tags`: выключенный тег не
	 * закрывается, у включённого своё значение важнее значения набора.
	 *
	 * Имя с префиксом (`tag_`): значения фасада и самого тега в разметке
	 * сливаются в один объект, и у тега уже есть свой `closable` —
	 * трёхзначный, «как у набора». Геттер назван так же, как проп фасада,
	 * поэтому состояние адаптера в типах его знает.
	 */
	get tag_closable(): boolean {
		return this._context?.adapters.tags.closable ?? false
	}
}
