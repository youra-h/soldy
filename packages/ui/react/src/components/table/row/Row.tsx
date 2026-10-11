import type { ElementType, ReactElement } from 'react'
import { toAriaProps, toRootProps, withRenderBoundary } from '../../../adapter'
import { CheckBox } from '../../check-box'
import { TableRowCells } from './Cells'
import { useSetupTableRow } from './setup.component'
import type { TableRowProps } from './base.component'

/**
 * TableRow — строка таблицы (`Table.Row`). Корень — `tr`, рисуется по `tag`
 * строки. На нём модификаторы размера и варианта (их строке диктует таблица)
 * и набор `dataset`: `data-selected` (пишет выбор коллекции — всем строкам) и
 * `data-disabled`, а в сетке — `aria-selected`. Нажатие по строке ловит
 * плагин сетки таблицы: в сетке оно выбирает строку, в роли `table` не делает
 * ничего — выбирают чекбоксом.
 *
 * Строка — под границей перерисовки (`withRenderBoundary`): таблица
 * перерисовывается на каждый выбор и смену своего пропа, а строку
 * перерисовывают только её собственное состояние и смена её входов —
 * экземпляра и слота `cell`.
 *
 * Ячейка колонки выбора — только пока выбор строк включён (`selecting`: режим
 * не `none`), как её заголовок в шапке. Чекбокс строки — CheckBox
 * (`embedded: 'table.select'`) над экземпляром, который держит таблица:
 * отметку, «выключен», размер и вариант она пишет ему от выбора и строки, а
 * клик по нему — просьба, которую она выполняет выбором строки. Поэтому ни
 * значения, ни обработчиков здесь нет: отменённый выбор отметку не меняет.
 * Имя — ссылка на заголовок строки (`aria-labelledby` на `rowHeaderId`);
 * заголовка нет — нет и ссылки.
 *
 * Ключ чекбокса — его экземпляр. Компонент собирается над `ctrl` один раз за
 * монтирование, а чекбокс строка берёт у таблицы на монтирование своего
 * контекста: пересобранная строка (StrictMode, `<Activity>`) отпускает
 * прежний и получает новый — и CheckBox над новым монтируется заново, а не
 * остаётся над отпущенным, которому таблица отметку больше не пишет.
 *
 * Ячейки колонок — своя внутренняя часть (`TableRowCells`) под своей
 * границей: выбор перерисовывает строку, а ячейки — нет. Ячейки (`cells`) и
 * их набор (`cellAria`) уходят ей из состояния как есть, слот `cell` — каким
 * его отдала таблица: новый объект на каждый рендер строки снял бы границу.
 */
export const TableRow = withRenderBoundary(function TableRow(
	props: TableRowProps,
): ReactElement | null {
	const { ctrl, ref, forwardProps, state, context } = useSetupTableRow(props)

	const { rendered, tag, selecting, cells, cellAria, rowHeaderId, attrs, aria, dataset } = state

	if (!rendered) return null

	const Tag = tag as ElementType
	// Чекбокс берётся только для ячейки выбора: у таблицы без выбора их нет
	const checkBox = selecting ? context?.adapters.table.checkBox : undefined

	return (
		<Tag {...toRootProps(ref, state, [attrs, aria, dataset], forwardProps)}>
			{selecting ? (
				<td className="s-table-row__select" {...toAriaProps(cellAria)}>
					<CheckBox
						key={checkBox?.uid}
						embedded="table.select"
						ctrl={checkBox}
						aria_labelledBy={rowHeaderId}
					/>
				</td>
			) : null}
			<TableRowCells row={ctrl} cells={cells} cellAria={cellAria} cell={props.cell} />
		</Tag>
	)
})
