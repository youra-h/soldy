import { Show, type JSX } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import { createRootProps, rootTag } from '../../../adapter'
import { CheckBox } from '../../check-box'
import { TableRowCells } from './Cells'
import { setupTableRow } from './setup.component'
import type { TableRowProps } from './base.component'

/**
 * TableRow — строка таблицы (`Table.Row`). Корень — `tr`, рисуется по `tag`
 * строки. На нём модификаторы размера и варианта (их строке диктует таблица)
 * и набор `dataset`: `data-selected` (пишет выбор коллекции — всем строкам) и
 * `data-disabled`, а в сетке — `aria-selected`. Нажатие по строке ловит
 * плагин сетки таблицы: в сетке оно выбирает строку, в роли `table` не делает
 * ничего — выбирают чекбоксом.
 *
 * Ячейка колонки выбора — только пока выбор строк включён (`selecting`: режим
 * не `none`), как её заголовок в шапке. Чекбокс строки — CheckBox
 * (`embedded: 'table.select'`) над экземпляром, который держит таблица:
 * отметку, «выключен», размер и вариант она пишет ему от выбора и строки, а
 * клик по нему — просьба, которую она выполняет выбором строки. Поэтому ни
 * значения, ни обработчиков здесь нет: отменённый выбор отметку не меняет.
 * Чекбокс берётся только в этой ветке: геттер item-адаптера таблицы его
 * создаёт, и у таблицы без выбора чекбоксов строк нет. Имя — ссылка на
 * заголовок строки (`aria-labelledby` на `rowHeaderId`); заголовка нет — нет
 * и ссылки.
 *
 * Ячейки колонок — своя внутренняя часть (`TableRowCells`): ячейки (`cells`)
 * и их набор (`cellAria`) уходят ей из состояния, слот `cell` — каким его
 * отдала таблица.
 */
export function TableRow(props: TableRowProps): JSX.Element {
	const binding = setupTableRow(props)
	const state = binding.state
	const context = binding.context
	// Наборы ядра, поверх — атрибуты снаружи, `ref` адаптера последним
	const root = createRootProps(() => ({
		state,
		sets: [state.attrs, state.aria, state.dataset],
		forward: binding.forwardProps(),
	}))

	return (
		<Show when={state.rendered}>
			<Dynamic {...root()} component={rootTag(state.tag)} ref={binding.ref}>
				<Show when={state.selecting}>
					<td class="so-table-row__select" {...state.cellAria}>
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
