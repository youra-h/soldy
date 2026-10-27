<script lang="ts">
	import { Dynamic, toStyleText, toWrappedRootProps } from '../../adapter'
	import { CheckBox } from '../check-box'
	import { TableColumn } from './column'
	import { TableRow } from './row'
	import { setupTable } from './setup.component'
	import type { TableProps } from './base.component'

	let { ref = $bindable(), ...props }: TableProps = $props()
	const mountId = $props.id()

	const binding = setupTable(() => props, mountId, (node) => (ref = node))
	const state = binding.state
	const facade = binding.facade

	const VIEWPORT = 'so-table__viewport'
</script>

<!--
	Окно `so-table__viewport` — разметка вокруг корня `table`, а не корень: в нём таблица
	прокручивается вбок. Шапка и тело стоят вплотную: пробел Svelte оставил бы в таблице текстом.
-->
{#if state.rendered}
	{@const layout = toWrappedRootProps(
		state,
		[state.attrs, state.aria, state.dataset],
		binding.forwardProps,
		VIEWPORT,
	)}
	<Dynamic rendered tag="div" attributes={layout.wrapper} attach={binding.consumerRef}>
		<Dynamic rendered tag={state.tag} attributes={layout.root} attach={binding.bindRef}>
			<thead class="so-table__head">
				<tr class="so-table__head-row" {...state.headRowAria}>
					{#if state.mode === 'multiple'}
						<th class="so-table__select" {...state.cellAria}>
							<CheckBox
								embedded="table.select-all"
								ctrl={facade.selectAll}
								aria_label={state.names_selectAll}
							/>
						</th>
					{:else if state.mode === 'single'}
						<!-- `td`, а не `th`: пустой заголовок скринридеры считают ошибкой. -->
						<td class="so-table__select" {...state.cellAria}></td>
					{/if}
					<!-- Проброс — только при заданном `header`: сниппет непрозрачен. -->
					{#each state.shownColumns ?? [] as column (column.uid)}
						{#snippet caption(scope: { text: string; sortable: boolean })}
							{@render props.header?.({ ...scope, column })}
						{/snippet}
						<TableColumn ctrl={column} children={props.header ? caption : undefined} />
					{/each}
				</tr>
			</thead><tbody class="so-table__body">
				<!-- Ключ записи: оставшаяся в окне строка — тот же узел с фокусом сетки. -->
				{#each state.drawn ?? [] as entry (entry.key)}
					{#if entry.kind === 'filler'}
						<tr
							class="so-table__filler-row"
							aria-hidden="true"
							style={toStyleText(entry.style)}
						>
							<td class="so-table__filler" colspan={state.columnCount}></td>
						</tr>
					{:else}
						<TableRow ctrl={entry.item} cell={props.cell} />
					{/if}
				{/each}
				{#if state.shown?.length === 0}
					<tr class="so-table__empty-row">
						<td class="so-table__empty" colspan={state.columnCount}>
							{@render props.empty?.()}
						</td>
					</tr>
				{/if}
			</tbody>
		</Dynamic>
	</Dynamic>
{/if}
