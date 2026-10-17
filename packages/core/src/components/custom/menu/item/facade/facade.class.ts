import { TSelectionItemFacade } from '../../../../base/collection'
import type { TItemContext } from '../../../../base/collection'
import type {
	TMenuCollectionExtensions,
	TMenuItemCollectionFacadeEvents,
} from '../../collection/types'
import type { IMenuItem } from '../types'

/**
 * Фасад пункта меню — один на действие и флажок.
 *
 * `selected` — из базы (`TSelectionItemFacade`): отметка флажка — выбор
 * коллекции меню, и разметка флажка рисует её по нему. Своего сверх базы
 * нет: что делает нажатие, решает item-адаптер `menu` (`choose`, `toggle`), а
 * разметка зовёт его через `context`. Его карту фасад отдаёт наружу целиком,
 * как любой фасад: новое событие адаптера доедет само.
 */
export class TMenuItemCollectionFacade extends TSelectionItemFacade<
	IMenuItem,
	TMenuCollectionExtensions,
	TMenuItemCollectionFacadeEvents
> {
	override setContext(context: TItemContext<IMenuItem, TMenuCollectionExtensions>): void {
		super.setContext(context)

		if (!this._context) return

		this.events.relayAll(this._context.adapters.menu.events)
	}
}
