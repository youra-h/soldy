import type { Accessor, JSX } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import type { ITableRow, TAriaAttributes, TTableCell } from '@soldy-ui/core'
import { KeyedFor, renderSlot, toText } from '../../../adapter'
import type { TableRowProps } from './base.component'

/** Входы ячеек — то, что строка уже получила, и сама строка для scope слота. */
type TTableRowCellsProps = {
	/** Строка ячеек — в scope слота `cell` её кладут ячейки */
	readonly row: ITableRow
	/** Ячейки строки — по одной на показанную колонку, в её порядке */
	readonly cells: readonly TTableCell[] | undefined
	/** Набор каждой ячейки строки: у ячеек нет экземпляра */
	readonly cellAria: TAriaAttributes | undefined
	/** Слот `cell` таблицы — каким его отдала строка */
	readonly cell: TableRowProps['cell']
}

/**
 * Ячейки строки таблицы — внутренняя часть `Table.Row` без дескриптора и
 * контекста, как `_TableRowCells` у Vue и `TableRowCells` у React: своего у
 * ячеек нет, всё, что они рисуют, строка уже получила от фасада. Из пакета не
 * экспортируется.
 *
 * Своей границы перерисовки, как у Vue и React, ячейкам не нужно: Solid
 * перерисовывает не компонент, а то, что прочло сменившееся. Выбор строки
 * (`data-selected` на `tr`, в сетке ещё `aria-selected`) меняет атрибуты
 * строки, а содержимое ячейки читает только свою ячейку (`change:cells` —
 * колонки, запись строки) и слот: «выбрать все» ни одной ячейки и слота не
 * трогает.
 *
 * Петля — по колонке ячейки (`KeyedFor`): ячейки строки — новые записи на
 * каждую смену, и `<For>`, сравнивая их по ссылке, пересоздавал бы узлы, а с
 * ними фокус сетки, на каждую смену записи. Узел ячейки держит колонку, а
 * новую ячейку получает аксессором и рисует её на месте.
 *
 * Разметка — ячейка на ячейку строки, без обёртки: ячейки — дети `tr`. Набор
 * ячейки — `data-align` колонки, набор ячеек строки (`cellAria`: в сетке ячейка
 * принимает фокус) и, у заголовка строки, его `id`. Ячейка колонки
 * `rowHeader` — заголовок строки: `th` с `scope="row"`, на её текст ссылается
 * имя чекбокса строки. Остальные — `td`. Класс один: тема различает их тегом.
 *
 * Содержимое ячейки — слот `cell` со scope `{ row, column, value }`: строку в
 * scope кладут ячейки, таблица отдаёт строке свой слот как есть. Без слота —
 * значение текстом (`toText`): тип поля записи таблица не знает, и Solid его,
 * в отличие от интерполяции Vue, как есть не нарисует.
 */
export function TableRowCells(props: TTableRowCellsProps): JSX.Element {
	/** Ячейка колонки — заголовок строки или обычная. */
	const drawCell = (cell: Accessor<TTableCell>) => (
		<Dynamic
			component={cell().rowHeader ? 'th' : 'td'}
			class="so-table-row__cell"
			scope={cell().rowHeader ? 'row' : undefined}
			{...cell().dataset}
			{...props.cellAria}
			{...cell().aria}
		>
			{renderSlot(props.cell, {
				row: props.row,
				column: cell().column,
				value: cell().value,
			}) ?? toText(cell().value)}
		</Dynamic>
	)

	return (
		<KeyedFor each={props.cells} by={(cell) => cell.column.uid}>
			{drawCell}
		</KeyedFor>
	)
}
