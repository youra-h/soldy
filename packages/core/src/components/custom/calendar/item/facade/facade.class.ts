import { TOrderItemFacade } from '../../../../base/collection'
import type { TItemContext } from '../../../../base/collection'
import type {
	TCalendarCollectionExtensions,
	TCalendarItemCollectionFacadeEvents,
} from '../../collection/types'
import type { ICalendarItem } from '../types'

/**
 * Фасад дня — членство дня в коллекции календаря.
 *
 * `order` — из базы; своё — выбран ли день (`selected`) и стоит ли на нём
 * фокус сетки (`focused`). Их считают расширения, фасад только отдаёт.
 */
export class TCalendarItemCollectionFacade extends TOrderItemFacade<
	ICalendarItem,
	TCalendarCollectionExtensions,
	TCalendarItemCollectionFacadeEvents
> {
	override setContext(context: TItemContext<ICalendarItem, TCalendarCollectionExtensions>): void {
		super.setContext(context)

		if (!this._context) return

		this.events.relayAll(this._context.adapters.selection.events)
		this.events.relayAll(this._context.adapters.focus.events)
	}

	get selected(): boolean {
		return this._context?.adapters.selection.selected ?? false
	}

	get focused(): boolean {
		return this._context?.adapters.focus.focused ?? false
	}
}
