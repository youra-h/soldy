import type { JSX } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import { createPartProps, createRootProps, rootTag } from '../../../adapter'
import { Show } from '../../../adapter/runtime/flow'
import { CheckBox } from '../../check-box'
import { TableRowCells } from './Cells'
import { setupTableRow } from './setup.component'
import type { TableRowProps } from './base.component'

/**
 * Строка таблицы — `tr`, её рисует таблица по записи `drawn`. Чекбокс строки держит
 * таблица; берётся он только в ячейке выбора: геттер item-адаптера его создаёт.
 */
export function TableRow(props: TableRowProps): JSX.Element {
	const binding = setupTableRow(props)
	const state = binding.state
	const context = binding.context
	const root = createRootProps(() => ({
		state,
		sets: [state.attrs, state.aria, state.dataset],
		forward: binding.forwardProps(),
	}))
	const cellAria = createPartProps(() => state.cellAria)

	return (
		<Show when={state.rendered}>
			<Dynamic {...root()} component={rootTag(state.tag)} ref={binding.ref}>
				<Show when={state.selecting}>
					<td class="so-table-row__select" {...cellAria()}>
						<CheckBox
							embedded="table.select"
							ctrl={context?.adapters.table.checkBox}
							aria_labelledBy={state.rowHeaderId}
						/>
					</td>
				</Show>
				<TableRowCells
					row={binding.ctrl}
					cells={state.cells}
					cellAria={state.cellAria}
					cell={props.cell}
				/>
			</Dynamic>
		</Show>
	)
}
