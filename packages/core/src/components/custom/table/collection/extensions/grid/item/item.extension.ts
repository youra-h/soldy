import { TBaseItemExtension } from '../../../../../../base/collection'
import type { TAriaAttributes } from '../../../../../../../common'
import type { ITableRow } from '../../../../row/types'
import type { ITableGridExtension, ITableGridItemExtension, TTableGridItemEvents } from '../types'

/**
 * Item-адаптер сетки — набор ячеек строки.
 *
 * Своего состояния у адаптера нет: набор у всех ячеек сетки один, и держит его
 * родитель. Ячейка под фокусом своего набора не получает — остановка Tab у
 * сетки одна, сама таблица, — поэтому переход фокуса строку не трогает.
 */
export class TTableGridItemExtension<TRow extends ITableRow = ITableRow>
	extends TBaseItemExtension<TRow, ITableGridExtension<TRow>, TTableGridItemEvents>
	implements ITableGridItemExtension<TRow>
{
	constructor(row: TRow, parent: ITableGridExtension<TRow>) {
		super(row, parent)

		this.events.relay(parent.events, ['change:cellAria'])
	}

	get cellAria(): TAriaAttributes {
		return this._parent.cellAria
	}
}
