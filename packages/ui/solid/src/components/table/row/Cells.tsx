import type { Accessor, JSX } from 'solid-js'
import type { ITableRow, TAriaAttributes, TTableCell } from '@soldy-ui/core'
import {
	KeyedFor,
	createPartNode,
	createPartNodes,
	liveScope,
	renderSlot,
	type TPartNodeAttributes,
} from '../../../adapter'
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

/** Свои атрибуты ячейки — заголовка строки и обычной. */
const ROW_HEADER: TPartNodeAttributes = { class: 'so-table-row__cell', scope: 'row' }
const CELL: TPartNodeAttributes = { class: 'so-table-row__cell' }

/** Тег — часть ключа: сменился заголовок строки — ячейка новая. */
function keyOf(cell: TTableCell): string {
	return `${cell.column.uid}:${cell.rowHeader}`
}

function tagOf(cell: TTableCell): string {
	return cell.rowHeader ? 'th' : 'td'
}

function textOf(cell: TTableCell): string {
	return cell.text
}

/** Ячейки строки — внутренняя часть `Table.Row` без дескриптора и контекста, не экспортируется. */
export function TableRowCells(props: TTableRowCellsProps): JSX.Element {
	/** Три набора ячейки — одним объектом; в окне гидратации их держат узлы. */
	const attributesOf = (cell: TTableCell): TPartNodeAttributes => ({
		...(cell.rowHeader ? ROW_HEADER : CELL),
		...cell.dataset,
		...props.cellAria,
		...cell.aria,
	})

	// Без слота ячейка — значение текстом: узлы всех ячеек строки — одно мемо
	if (props.cell === undefined) {
		return createPartNodes({
			each: () => props.cells,
			by: keyOf,
			tag: tagOf,
			attributes: attributesOf,
			text: textOf,
		})
	}

	/**
	 * Содержимое ячейки со слотом: слот, а на месте пустого — значение текстом.
	 * Живой scope — только для функции слота.
	 */
	const content = (cell: Accessor<TTableCell>): JSX.Element => {
		const slot = props.cell
		const scope =
			typeof slot === 'function'
				? liveScope(() => ({ row: props.row, column: cell().column, value: cell().value }))
				: undefined

		return renderSlot(slot, scope) ?? cell().text
	}

	const drawCell = (cell: Accessor<TTableCell>): JSX.Element =>
		createPartNode(
			tagOf(cell()),
			() => attributesOf(cell()),
			() => content(cell),
		)

	return (
		<KeyedFor each={props.cells} by={keyOf}>
			{drawCell}
		</KeyedFor>
	)
}
