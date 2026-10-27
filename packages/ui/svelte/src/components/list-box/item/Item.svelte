<script lang="ts">
	import { chainHandler, Dynamic, roleIcon, toControlAttrs, toRootForward, toRootProps } from '../../../adapter'
	import { ItemRow } from '../../item-row'
	import { Icon } from '../../icon'
	import { setupListBoxItem } from './setup.component'
	import type { ListBoxItemAttributes, ListBoxItemProps } from './base.component'

	let { ref = $bindable(), ...props }: ListBoxItemProps = $props()
	const mountId = $props.id()

	const binding = setupListBoxItem(() => props, mountId, (node) => (ref = node))
	const state = binding.state
	const context = binding.context

	const CHECK = roleIcon('check')
</script>

<!--
	Тег строки фиксирован (`div`): под него написан `TListBoxItem._ariaTag`. Своих роли и
	`tabindex` строка (`ItemRow`) не пишет: их несёт набор элемента.
	Отметка рисуется и у невыбранных: она держит место. `aria-hidden`: выбор скринридеру
	объявляет `aria-selected`.
-->
{#snippet mark()}
	<span class="so-list-box-item__indicator" aria-hidden="true">
		{#if props['indicator-icon']}
			{@render props['indicator-icon']({ selected: state.selected ?? false })}
		{:else if state.selected}
			<Icon embedded="list-box.indicator" tag={CHECK} size={state.size} />
		{/if}
	</span>
{/snippet}

<Dynamic
	rendered={state.rendered}
	tag={state.tag}
	attributes={toRootProps(
		state,
		[state.dataset, state.attrs],
		toRootForward(binding.forwardProps),
	)}
	attach={binding.attachElement}
>
	<ItemRow
		embedded="list-box.row"
		tag="div"
		view={state.view}
		disabled={state.disabled}
		size={state.size}
		variant={state.variant}
		{...state.aria}
		{...state.dataset}
		{...toControlAttrs<ListBoxItemAttributes>(binding.forwardProps)}
		onclick={chainHandler(() => context?.adapters.list.choose(), binding.forwardProps.onclick)}
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
