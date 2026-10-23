import type { ReactElement } from 'react'
import type { ITableRow, TAriaAttributes, TTableCell } from '@soldy-ui/core'
import { renderSlot, toAriaProps, withRenderBoundary } from '../../../adapter'
import type { TableRowProps } from './base.component'

type TTableRowCellsProps = {
	readonly row: ITableRow
	readonly cells: readonly TTableCell[] | undefined
	readonly cellAria: TAriaAttributes | undefined
	readonly cell: TableRowProps['cell']
}

/**
 * Ячейки строки таблицы — внутренняя часть `Table.Row` под своей границей
 * перерисовки: выбор перерисовывает строку, но не ячейки. Из пакета не экспортируется.
 */
export const TableRowCells = withRenderBoundary(function TableRowCells({
	row,
	cells,
	cellAria,
	cell: slot,
}: TTableRowCellsProps): ReactElement {
	return (
		<>
			{cells?.map((cell) => {
				const Cell = cell.rowHeader ? 'th' : 'td'

				return (
					<Cell
						key={cell.column.uid}
						className="so-table-row__cell"
						scope={cell.rowHeader ? 'row' : undefined}
						{...toAriaProps(cell.dataset)}
						{...toAriaProps(cellAria)}
						{...toAriaProps(cell.aria)}
					>
						{renderSlot(slot, { row, column: cell.column, value: cell.value }) ??
							cell.text}
					</Cell>
				)
			})}
		</>
	)
})
