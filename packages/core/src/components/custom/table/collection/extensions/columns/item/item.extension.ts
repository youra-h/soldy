import { TBaseItemExtension } from '../../../../../../base/collection'
import type { ITableRow } from '../../../../row/types'
import type {
	ITableColumnsExtension,
	ITableColumnsItemExtension,
	TTableCell,
	TTableColumnsItemEvents,
} from '../types'

/**
 * Item-адаптер колонок — ячейки строки.
 *
 * Ячеек не хранит никто: на каждое чтение это запись строки, разложенная по
 * показанным колонкам, — по ячейке на колонку, в их порядке. Своего состояния
 * у адаптера нет: колонки знает родитель, запись — сама строка.
 *
 * `change:cells` без аргумента — «перечитай `cells`». Источников у него два:
 * родитель сообщает о колонках (показанные, поле и выравнивание показанной),
 * строка — о своей записи.
 */
export class TTableColumnsItemExtension<TRow extends ITableRow = ITableRow>
	extends TBaseItemExtension<TRow, ITableColumnsExtension<TRow>, TTableColumnsItemEvents>
	implements ITableColumnsItemExtension<TRow>
{
	constructor(row: TRow, parent: ITableColumnsExtension<TRow>) {
		super(row, parent)

		this.events.relay(parent.events, ['change:cells'])
		this.events.relay(row.events, [{ from: 'change:data', as: 'change:cells' }])
	}

	get cells(): TTableCell[] {
		const data = this._item.data

		return this._parent.shownColumns.map((column) => ({
			column,
			// Поле записи, как `data[field]`: записи нет — нет и значения
			value: data === undefined ? undefined : Reflect.get(data, column.field),
			dataset: { 'data-align': column.align },
		}))
	}
}
