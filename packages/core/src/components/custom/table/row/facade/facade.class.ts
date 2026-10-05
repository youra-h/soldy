import { TSelectionItemFacade } from '../../../../base/collection'
import type { TItemContext } from '../../../../base/collection'
import type { TTableCell } from '../../collection/extensions'
import type {
	TTableCollectionExtensions,
	TTableRowCollectionFacadeEvents,
} from '../../collection/types'
import type { ITableRow } from '../types'

/**
 * Фасад строки — её членство в коллекции строк.
 *
 * `selected` и `order` — из базы; своё — ячейки (`cells`): запись строки,
 * разложенная по показанным колонкам. Считает их item-адаптер колонок, фасад
 * только отдаёт.
 */
export class TTableRowCollectionFacade extends TSelectionItemFacade<
	ITableRow,
	TTableCollectionExtensions,
	TTableRowCollectionFacadeEvents
> {
	override setContext(context: TItemContext<ITableRow, TTableCollectionExtensions>): void {
		super.setContext(context)

		if (!this._context) return

		this.events.relayAll(this._context.adapters.columns.events)
	}

	/** Ячейки строки — по одной на показанную колонку. Вне коллекции ячеек нет */
	get cells(): TTableCell[] {
		return this._context?.adapters.columns.cells ?? []
	}
}
