import { TSelectionItemFacade } from '../../../../base/collection'
import type { TAriaAttributes } from '../../../../../common'
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
 * разложенная по показанным колонкам, — и `id` заголовка строки, которым
 * называют её чекбокс выбора (`rowHeaderId`). Считает их item-адаптер колонок.
 * Включён ли выбор строк — у строки тогда ячейка выбора, — отдаёт item-адаптер
 * таблицы (`selecting`), набор ячеек сетки — item-адаптер сетки
 * (`cellAria`). Фасад только отдаёт.
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
		this.events.relayAll(this._context.adapters.table.events)
		this.events.relayAll(this._context.adapters.grid.events)
	}

	/** Ячейки строки — по одной на показанную колонку. Вне коллекции ячеек нет */
	get cells(): TTableCell[] {
		return this._context?.adapters.columns.cells ?? []
	}

	/**
	 * `id` заголовка строки — пока его ячейка показана. Вне коллекции и без
	 * колонки `rowHeader` — `undefined`
	 */
	get rowHeaderId(): string | undefined {
		return this._context?.adapters.columns.rowHeaderId
	}

	/**
	 * Набор каждой ячейки строки, и ячейки выбора тоже: в сетке ячейка
	 * принимает фокус. Вне сетки и вне коллекции пуст
	 */
	get cellAria(): TAriaAttributes {
		return this._context?.adapters.grid.cellAria ?? {}
	}

	/** Выбор строк включён: у строки ячейка выбора. Вне коллекции — нет */
	get selecting(): boolean {
		return this._context?.adapters.table.selecting ?? false
	}
}
