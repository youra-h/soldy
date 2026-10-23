<script lang="ts">
	import { Dynamic, toRootProps } from '../../../adapter'
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
	Ячейки стоят вплотную: пробел между ними Svelte оставил бы в строке текстом.
-->
{#if state.rendered}
	<Dynamic
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
			</td>{/if}{#each state.cells ?? [] as cell (cell.column.uid)}
			<svelte:element
				this={cell.rowHeader ? 'th' : 'td'}
				class="so-table-row__cell"
				scope={cell.rowHeader ? 'row' : undefined}
				{...cell.dataset}
				{...state.cellAria}
				{...cell.aria}
			>
				{#if props.cell}
					{@render props.cell({ row, column: cell.column, value: cell.value })}
				{:else}
					{cell.text}
				{/if}
			</svelte:element>
		{/each}
	</Dynamic>
{/if}
