<script lang="ts">
	import { chainHandler, Dynamic, roleIcon, toControlAttrs, toRootForward, toRootProps } from '../../../adapter'
	import { ItemRow } from '../../item-row'
	import { Icon } from '../../icon'
	import { setupMenuCheckboxItem } from './setup.component'
	import type { MenuCheckboxItemAttributes, MenuCheckboxItemProps } from './base.component'

	let { ref = $bindable(), ...props }: MenuCheckboxItemProps = $props()
	const mountId = $props.id()

	const binding = setupMenuCheckboxItem(() => props, mountId, (node) => (ref = node))
	const state = binding.state
	const context = binding.context

	const CHECK = roleIcon('check')
</script>

<!--
	Отметка — и у неотмеченного: обёртка держит колонку отметок. `aria-hidden`: состояние
	объявляет `aria-checked`. Обёртки без пробелов: пустую тема прячет по `:empty`.
-->
{#snippet mark()}
	{#if props['indicator-icon']}
		{@render props['indicator-icon']({ selected: state.selected ?? false })}
	{:else if state.selected}
		<Icon embedded="menu.indicator" tag={CHECK} size={state.size} />
	{/if}
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
		embedded="menu.row"
		tag="div"
		size={state.size}
		disabled={state.disabled}
		{...state.aria}
		{...toControlAttrs<MenuCheckboxItemAttributes>(binding.forwardProps)}
		onclick={chainHandler(() => context?.adapters.menu.toggle(), binding.forwardProps.onclick)}
	>
		{#snippet leading()}
			<span class="so-menu-item__indicator" aria-hidden="true">{@render mark()}</span><span
				class="so-menu-item__icon">{@render props.leading?.()}</span
			>
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
			<span class="so-menu-item__shortcut">{@render props.trailing?.()}</span>
		{/snippet}
	</ItemRow>
</Dynamic>
