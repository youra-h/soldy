<script lang="ts">
	import {
		chainHandler,
		Dynamic,
		roleIcon,
		toControlAttrs,
		toRootForward,
		toRootProps,
	} from '../../../adapter'
	import { ItemRow } from '../../item-row'
	import { Icon } from '../../icon'
	import { setupSelectItem } from './setup.component'
	import type { SelectItemAttributes, SelectItemProps } from './base.component'

	let { ref = $bindable(), ...props }: SelectItemProps = $props()
	const mountId = $props.id()

	const binding = setupSelectItem(() => props, mountId, (node) => (ref = node))
	const state = binding.state
	const context = binding.context

	const CHECK = roleIcon('check')
</script>

<!--
	Тег строки фиксирован (`span`): под него написан `TSelectItem._ariaTag`. `dataset` — и на
	строке: фон выбора и подсветки тема рисует на кнопке.
	Отметка рисуется и у невыбранных: она держит место, и строка не прыгает при выборе.
	`aria-hidden`: выбор скринридеру объявляет `aria-selected`.
-->
{#snippet mark()}
	<span class="so-select-item__indicator" aria-hidden="true">
		{#if props['indicator-icon']}
			{@render props['indicator-icon']({ selected: state.selected ?? false })}
		{:else if state.selected}
			<Icon embedded="select.indicator" tag={CHECK} size={state.size} />
		{/if}
	</span>
{/snippet}

{#if state.rendered}
	<Dynamic
		tag={state.tag}
		attributes={toRootProps(state, [state.dataset, state.attrs], toRootForward(binding.forwardProps))}
		attach={binding.attachElement}
	>
		<ItemRow
			embedded="select.row"
			tag="span"
			size={state.size}
			variant={state.variant}
			disabled={state.disabled}
			{...state.aria}
			{...state.dataset}
			{...toControlAttrs<SelectItemAttributes>(binding.forwardProps)}
			onclick={chainHandler(() => context?.adapters.select.choose(), binding.forwardProps.onclick)}
		>
			{#snippet leading()}
				{#if state.indicator === 'start'}{@render mark()}{/if}{@render props.leading?.()}
			{/snippet}
			{#if props.children}
				{@render props.children({
					text: state.text ?? '',
					selected: state.selected ?? false,
				})}
			{:else}
				{state.text}
			{/if}
			{#snippet trailing()}
				{@render props.trailing?.()}{#if state.indicator === 'end'}{@render mark()}{/if}
			{/snippet}
		</ItemRow>
	</Dynamic>
{/if}
