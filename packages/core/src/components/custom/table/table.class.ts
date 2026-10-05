import { TControl } from '../../base/control'
import type { ITable, ITableProps, TTableEvents } from './types'

/**
 * Таблица — владелец коллекции строк, как ListBox — владелец опций. Корень —
 * `table`.
 *
 * Строки, колонки, ячейки и выбор строк — коллекция и её расширения
 * (`collection/`): строки — элементы над записями приложения, колонки —
 * своя коллекция в расширении `columns`, ячейки — проекция строки на
 * показанные колонки. Своих пропсов у таблицы пока нет: `disabled`, `size` и
 * `variant` — от контрола, строкам их раздаёт расширение `table`.
 */
export class TTable extends TControl<ITableProps, TTableEvents> implements ITable {
	static override baseClass = 's-table'

	static defaultValues: typeof TControl.defaultValues = {
		...TControl.defaultValues,
		tag: 'table',
	}
}
