import { TBaseItemExtension } from '../../../../../../base/collection'
import type { ITableColumn } from '../../../../column/types'
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
 * у адаптера нет: колонки знает родитель, запись и набор заголовка — сама
 * строка.
 *
 * **Заголовок строки** — ячейка колонки `rowHeader`. Таких колонок бывает
 * несколько (имя и фамилия), и заголовками рисуются все, но набор заголовка
 * строки (`headerAria`, в нём `id`) получает только первая показанная: `id` в
 * документе один. На него ссылается имя чекбокса выбора строки
 * (`rowHeaderId`), и ссылка есть, только пока ячейка показана.
 *
 * `change:cells` без аргумента — «перечитай `cells` и `rowHeaderId`».
 * Источников у него два: родитель сообщает о колонках (показанные, поле,
 * выравнивание и признак заголовка показанной), строка — о своей записи и
 * наборе своего заголовка.
 */
export class TTableColumnsItemExtension<TRow extends ITableRow = ITableRow>
	extends TBaseItemExtension<TRow, ITableColumnsExtension<TRow>, TTableColumnsItemEvents>
	implements ITableColumnsItemExtension<TRow>
{
	constructor(row: TRow, parent: ITableColumnsExtension<TRow>) {
		super(row, parent)

		this.events.relay(parent.events, ['change:cells'])
		this.events.relay(row.events, [
			{ from: 'change:data', as: 'change:cells' },
			{ from: 'change:headerAria', as: 'change:cells' },
		])
	}

	get cells(): TTableCell[] {
		const data = this._item.data
		const header = this._header

		return this._parent.shownColumns.map((column) => ({
			column,
			// Поле записи, как `data[field]`: записи нет — нет и значения
			value: data === undefined ? undefined : Reflect.get(data, column.field),
			rowHeader: column.rowHeader,
			aria: column === header ? this._item.headerAria.toObject() : {},
			dataset: { 'data-align': column.align },
		}))
	}

	get rowHeaderId(): string | undefined {
		return this._header ? this._item.headerAria.get('id') : undefined
	}

	/** Первая показанная колонка заголовка строки: ей достаётся набор заголовка. */
	private get _header(): ITableColumn | undefined {
		return this._parent.shownColumns.find((column) => column.rowHeader)
	}
}
