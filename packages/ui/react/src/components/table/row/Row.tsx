import type { ElementType, ReactElement } from 'react'
import { toAriaProps, toRootProps, withRenderBoundary } from '../../../adapter'
import { CheckBox } from '../../check-box'
import { TableRowCells } from './Cells'
import { useSetupTableRow } from './setup.component'
import type { TableRowProps } from './base.component'

/**
 * TableRow — строка таблицы (`Table.Row`) под границей перерисовки. Ключ
 * чекбокса — его экземпляр: AGENTS.md (React), «Пересобранный инстанс и `key`».
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
				<td className="so-table-row__select" {...toAriaProps(cellAria)}>
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
