import type { ElementType, ReactElement } from 'react'
import {
	Elevate,
	relaySlot,
	renderSlot,
	toAriaProps,
	toReactStyle,
	toWrappedRootProps,
} from '../../adapter'
import { CheckBox } from '../check-box'
import { TableColumn } from './column'
import { TableRow } from './row'
import { useSetupTable } from './setup.component'
import type { TableProps } from './base.component'

/**
 * Table — таблица по паттернам APG Table и Sortable Table: окно
 * `so-table__viewport` вокруг корня `table` (AGENTS.md (React), «Корень и `ref`
 * потребителя»). Строки и ячейки — под границей перерисовки: корневой
 * AGENTS.md, «Адаптер обязан адаптировать».
 */
export function Table(props: TableProps): ReactElement | null {
	const { bindRef, forwardProps, state, layer, facade } = useSetupTable(props)

	const {
		rendered,
		tag,
		mode,
		names_selectAll,
		headRowAria,
		cellAria,
		shownColumns,
		drawn,
		shown,
		columnCount,
		attrs,
		aria,
		dataset,
	} = state

	if (!rendered) return null

	const Tag = tag as ElementType
	const { wrapper, root } = toWrappedRootProps(
		bindRef,
		state,
		[attrs, aria, dataset],
		forwardProps,
		'so-table__viewport',
	)
	const { selectAll } = facade

	return (
		<div {...wrapper}>
			<Tag {...root}>
				<Elevate layer={layer}>
					<thead className="so-table__head">
						<tr className="so-table__head-row" {...toAriaProps(headRowAria)}>
							{mode === 'multiple' ? (
								<th className="so-table__select" {...toAriaProps(cellAria)}>
									<CheckBox
										key={selectAll.uid}
										embedded="table.select-all"
										ctrl={selectAll}
										aria_label={names_selectAll}
									/>
								</th>
							) : mode === 'single' ? (
								<td className="so-table__select" {...toAriaProps(cellAria)} />
							) : null}
							{shownColumns?.map((column) => (
								<TableColumn key={column.uid} ctrl={column}>
									{relaySlot(props.header, { column })}
								</TableColumn>
							))}
						</tr>
					</thead>
					<tbody className="so-table__body">
						{drawn?.map((entry) =>
							entry.kind === 'filler' ? (
								<tr
									key={entry.key}
									className="so-table__filler-row"
									aria-hidden="true"
									style={toReactStyle(entry.style)}
								>
									<td className="so-table__filler" colSpan={columnCount} />
								</tr>
							) : (
								<TableRow key={entry.key} ctrl={entry.item} cell={props.cell} />
							),
						)}
						{shown?.length === 0 ? (
							<tr className="so-table__empty-row">
								<td className="so-table__empty" colSpan={columnCount}>
									{renderSlot(props.empty)}
								</td>
							</tr>
						) : null}
					</tbody>
				</Elevate>
			</Tag>
		</div>
	)
}
