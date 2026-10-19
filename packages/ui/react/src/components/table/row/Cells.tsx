import type { ReactElement } from 'react'
import type { ITableRow, TAriaAttributes, TTableCell } from '@soldy-ui/core'
import { renderSlot, toAriaProps, withRenderBoundary } from '../../../adapter'
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
 * контекста, как `_TableRowCells` у Vue: своего у ячеек нет, всё, что они
 * рисуют, строка уже получила от фасада. Из пакета не экспортируется.
 *
 * Отдельная единица — ради своей границы перерисовки (`withRenderBoundary`).
 * Выбор строки (`data-selected` на `tr`, в сетке ещё `aria-selected`)
 * перерисовывает строку, и без границы она рисовала бы заново все свои ячейки
 * и звала бы слот каждой — на «выбрать все» это тысячи строк. Под границей
 * ячейки перерисовываются, только когда сменился их вход: ячейки
 * (`change:cells` — колонки, запись строки), их набор (`change:cellAria`) или
 * слот. Строка отдаёт ячейки и набор из состояния как есть: `?? []` или спред
 * давали бы новый объект на каждый её рендер, и граница не держала бы.
 *
 * Слот граница сравнивает по идентичности. Таблица и строка передают его как
 * есть, поэтому ячейки перерисовывает только новый слот потребителя: стрелка в
 * его разметке — на каждый его рендер, но не на выбор, выбор потребителя не
 * перерисовывает.
 *
 * Разметка — ячейка на ячейку строки, ключ — колонка, без обёртки: ячейки —
 * дети `tr`. Набор ячейки — `data-align` колонки, набор ячеек строки
 * (`cellAria`: в сетке ячейка принимает фокус) и, у заголовка строки, его
 * `id`. Ячейка колонки `rowHeader` — заголовок строки: `th` с `scope="row"`,
 * на её текст ссылается имя чекбокса строки. Остальные — `td`. Класс один:
 * тема различает их тегом.
 *
 * Содержимое ячейки — слот `cell` со scope `{ row, column, value }`: строку в
 * scope кладут ячейки, таблица отдаёт строке свой слот как есть. Без слота —
 * значение текстом (`text` ячейки): тип поля записи таблица не знает, и текст
 * считает ядро по правилу, общему для всех адаптеров, — React объект как есть
 * не нарисует, а булево и `null` пропустит.
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
