import { TBaseItemExtension } from '../../../../../../base/collection'
import type { ICheckBox } from '../../../../../check-box/types'
import type { ITableRow } from '../../../../row/types'
import type { ITableExtension, ITableItemExtension, TTableItemEvents } from '../types'

/**
 * Item-адаптер таблицы — что строка знает о выборе строк таблицы.
 *
 * Своего состояния у адаптера нет: включён ли выбор строк и чекбокс выбора
 * строки держит родитель — таблица над коллекцией строк. Чекбокс живёт, пока
 * строка в коллекции, а не одно монтирование: его отметку таблица пишет от
 * выбора, и монтирование строки ей ничего не добавляет.
 */
export class TTableItemExtension<TRow extends ITableRow = ITableRow>
	extends TBaseItemExtension<TRow, ITableExtension<TRow>, TTableItemEvents>
	implements ITableItemExtension<TRow>
{
	constructor(row: TRow, parent: ITableExtension<TRow>) {
		super(row, parent)

		this.events.relay(parent.events, ['change:selecting'])
	}

	get selecting(): boolean {
		return this._parent.selecting
	}

	get checkBox(): ICheckBox {
		return this._parent.checkBoxOf(this._item)
	}
}
