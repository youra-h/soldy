import type {
	IExtension,
	IExtensionItems,
	IItemExtension,
	TBaseItemEventsExtension,
} from '../../../../../base/collection'
import type { TDatasetAttributes } from '../../../../../../common'
import type { TTableColumnsCollection, TTableColumnSource } from '../../../column/collection/types'
import type { ITableColumn } from '../../../column/types'
import type { ITableRow } from '../../../row/types'

export type TTableColumnsEvents = {
	/**
	 * Показанные колонки надо перечитать: сменились состав, порядок или
	 * видимость колонки. Без аргумента — читатель берёт `shownColumns`. Одна
	 * операция — одно событие, сколько бы колонок она ни задела
	 */
	'change:shownColumns': () => void
	/**
	 * Ячейки строк надо перечитать: сменились показанные колонки или поле и
	 * выравнивание показанной колонки. Без аргумента — читатель берёт `cells`
	 * строки. Одна операция — одно событие
	 */
	'change:cells': () => void
}

/**
 * Ячейка — пересечение записи строки и показанной колонки.
 *
 * Ячейка не хранится и элементом коллекции не бывает: потребитель её не
 * адресует. Это выход строки, который item-адаптер колонок собирает на каждое
 * чтение — так вид календаря раскладывает дни в сетки.
 */
export type TTableCell = {
	/** Колонка ячейки — по её `field` разметка выбирает содержимое */
	column: ITableColumn
	/** Поле записи строки под ключом колонки — `data[field]` */
	value: unknown
	/** Набор ячейки для темы — выравнивание колонки, `data-align` */
	dataset: TDatasetAttributes
}

export type TTableColumnsItemEvents = TBaseItemEventsExtension & {
	/**
	 * Ячейки строки надо перечитать: сменились показанные колонки, поле или
	 * выравнивание показанной колонки или запись строки. Без аргумента —
	 * читатель берёт `cells`
	 */
	'change:cells': () => void
}

/**
 * Item-адаптер колонок — ячейки строки.
 *
 * `TEvents` параметризован, чтобы наследник мог добавить своё событие (см.
 * `IItemExtension`).
 */
export interface ITableColumnsItemExtension<
	TRow extends ITableRow = ITableRow,
	TEvents extends TTableColumnsItemEvents = TTableColumnsItemEvents,
> extends IItemExtension<TRow, TEvents> {
	/** Ячейки строки — по одной на показанную колонку, в порядке колонок */
	readonly cells: TTableCell[]
}

/**
 * Контракт расширения колонок коллекции строк.
 *
 * Колонки — своя коллекция: её движок расширение создаёт и держит, поэтому
 * движок строк, переданный снаружи, переносит и состав колонок, и их порядок
 * и ширины. Ячейки строки отдаёт его item-адаптер.
 */
export interface ITableColumnsExtension<
	TRow extends ITableRow = ITableRow,
	// `any` в констрейнте намеренно: карта событий инвариантна, и требовать
	// здесь точный набор значило бы запретить наследнику её расширить
	TItemExt extends ITableColumnsItemExtension<TRow, any> = ITableColumnsItemExtension<TRow>,
>
	extends IExtension<TRow, TTableColumnsEvents>, IExtensionItems<TRow, TItemExt> {
	/** Движок колонок: порядок, состав, жизнь колонок — его стандартные детали */
	readonly engine: TTableColumnsCollection

	/** Колонки — все, и скрытые тоже, в порядке коллекции */
	get columns(): ReadonlyArray<ITableColumn>
	/**
	 * Задать колонки данными. Сверка по `field`: колонка с тем же `field` та же
	 * и обновляется на месте, новая встаёт в конец, пропавшая удаляется
	 */
	set columns(sources: readonly TTableColumnSource[])

	/** Показанные колонки — видимые, в порядке коллекции */
	readonly shownColumns: ReadonlyArray<ITableColumn>
}
