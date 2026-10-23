import type { Accessor, JSX } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import type { ITableRow, TAriaAttributes, TTableCell } from '@soldy-ui/core'
import { KeyedFor, createPartProps, liveScope, renderSlot } from '../../../adapter'
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

/** Ячейки строки — внутренняя часть `Table.Row` без дескриптора и контекста, не экспортируется. */
export function TableRowCells(props: TTableRowCellsProps): JSX.Element {
	const cellAria = createPartProps(() => props.cellAria)

	/**
	 * Содержимое ячейки: слот, а без него и на месте пустого — значение текстом.
	 * Живой scope — только для функции слота: ячеек тысячи, и ячейке без слота он ни к чему.
	 */
	const content = (cell: Accessor<TTableCell>): JSX.Element => {
		const slot = props.cell
		const scope =
			typeof slot === 'function'
				? liveScope(() => ({ row: props.row, column: cell().column, value: cell().value }))
				: undefined

		return renderSlot(slot, scope) ?? cell().text
	}

	/** Ячейка колонки — заголовок строки или обычная. */
	const drawCell = (cell: Accessor<TTableCell>) => {
		const dataset = createPartProps(() => cell().dataset)
		const aria = createPartProps(() => cell().aria)

		return (
			<Dynamic
				component={cell().rowHeader ? 'th' : 'td'}
				class="so-table-row__cell"
				scope={cell().rowHeader ? 'row' : undefined}
				{...dataset()}
				{...cellAria()}
				{...aria()}
			>
				{content(cell)}
			</Dynamic>
		)
	}

	return (
		<KeyedFor each={props.cells} by={(cell) => cell.column.uid}>
			{drawCell}
		</KeyedFor>
	)
}
