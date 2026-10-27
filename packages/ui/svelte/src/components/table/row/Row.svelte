<script lang="ts">
	import { Dynamic, runsOf, toRootProps } from '../../../adapter'
	import { CheckBox } from '../../check-box'
	import { setupTableRow } from './setup.component'
	import type { TableRowProps } from './base.component'

	let { ref = $bindable(), ...props }: TableRowProps = $props()
	const mountId = $props.id()

	const binding = setupTableRow(() => props, mountId, (node) => (ref = node))
	const state = binding.state
	const context = binding.context
	// Строка — в scope слота `cell`: её туда кладут ячейки
	const row = binding.ctrl
</script>

<!--
	Чекбокс берётся только в ветке `selecting`: геттер item-адаптера таблицы его создаёт.
	Ячейки — петля по колонке: записи новые на каждую смену, а узел с фокусом сетки остаётся.
	Своей границы перерисовки ячейкам не нужно: Svelte перерисовывает то, что прочло сменившееся.
	Ветки — над петлёй ячеек: ветка Svelte — блок с менеджером веток, эффектами и якорем, и в
	каждой ячейке таблицы она стоила заметную часть памяти строки (benchmarks/table/svelte.md).
	Слот или текст — ветка на строку, заголовок строки — на серию ячеек с тем же `rowHeader`
	(`runsOf`).
	Ячейки стоят вплотную: пробел между ними Svelte оставил бы в строке текстом.
-->
<Dynamic
	rendered={state.rendered}
	tag={state.tag}
	attributes={toRootProps(
		state,
		[state.attrs, state.aria, state.dataset],
		binding.forwardProps,
	)}
	attach={binding.attachElement}
>
	{#if state.selecting}<td class="so-table-row__select" {...state.cellAria}>
			<CheckBox
				embedded="table.select"
				ctrl={context?.adapters.table.checkBox}
				aria_labelledBy={state.rowHeaderId}
			/>
		</td>{/if}{#if props.cell}{#each runsOf(state.cells ?? [], 'rowHeader') as run}{#if run.value}{#each run.items as cell (cell.column.uid)}<th
						class="so-table-row__cell"
						scope="row"
						{...cell.dataset}
						{...state.cellAria}
						{...cell.aria}
					>
						{@render props.cell({ row, column: cell.column, value: cell.value })}
					</th>{/each}{:else}{#each run.items as cell (cell.column.uid)}<td
						class="so-table-row__cell"
						{...cell.dataset}
						{...state.cellAria}
						{...cell.aria}
					>
						{@render props.cell({ row, column: cell.column, value: cell.value })}
					</td>{/each}{/if}{/each}{:else}{#each runsOf(state.cells ?? [], 'rowHeader') as run}{#if run.value}{#each run.items as cell (cell.column.uid)}<th
						class="so-table-row__cell"
						scope="row"
						{...cell.dataset}
						{...state.cellAria}
						{...cell.aria}
					>
						{cell.text}
					</th>{/each}{:else}{#each run.items as cell (cell.column.uid)}<td
						class="so-table-row__cell"
						{...cell.dataset}
						{...state.cellAria}
						{...cell.aria}
					>
						{cell.text}
					</td>{/each}{/if}{/each}{/if}
</Dynamic>
