<script lang="ts">
	import { Dynamic, fieldText, roleIcon, toRootProps } from '../../../adapter'
	import { Button } from '../../button'
	import { Icon } from '../../icon'
	import { setupTableColumn } from './setup.component'
	import type { TableColumnProps } from './base.component'

	let { ref = $bindable(), ...props }: TableColumnProps = $props()
	const mountId = $props.id()

	const binding = setupTableColumn(() => props, mountId, (node) => (ref = node))
	const state = binding.state
	const column = binding.ctrl

	const SORT = roleIcon('arrowUpward')

	// Ширина — свойством узла и только когда разошлась с ним: спред писал бы её на каждую смену
	const width = fieldText(() => (state.resizer ? String(state.resizer.value) : undefined))
</script>

<!--
	Кнопку сортировки рисует колонка, а не таблица через слот: в подписи кнопка дописала бы своё
	имя к имени заголовка. Ширину поля attachment пишет после `min` и `max` (attachment-ы Svelte
	ставит после атрибутов), и её не прижимает ход по умолчанию, 0–100. Части стоят вплотную:
	пробел между ними Svelte оставил бы в заголовке текстом.
-->
<Dynamic
	rendered={state.rendered}
	tag={state.tag}
	attributes={toRootProps(
		state,
		[state.attrs, state.aria, state.dataset],
		binding.forwardProps,
		state.widthStyle,
	)}
	attach={binding.attachElement}
>
	<span class="so-table-column__content">
		<span class="so-table-column__text" {...state.textAria}>
			{#if props.children}
				{@render props.children({
					text: state.text ?? '',
					sortable: state.sortable ?? false,
				})}
			{:else}
				{state.text}
			{/if}
		</span>{#if state.sortable}<Button
				embedded="table.sort"
				type="button"
				class="so-table-column__sort"
				disabled={state.disabled}
				{...state.sortAria}
				onActionPress={() => column.toggleSort()}
			>
				<span class="so-table-column__sort-icon" aria-hidden="true">
					<Icon embedded="table.sort-icon" tag={SORT} />
				</span>
			</Button>{/if}
	</span>{#if state.resizerRendered && state.resizer}<span class="so-table-column__resizer">
			<input
				class="so-table-column__input"
				type="range"
				min={state.resizer.min}
				max={state.resizer.max}
				{...state.resizerAria}
				{...width}
			/>
		</span>{/if}
</Dynamic>
