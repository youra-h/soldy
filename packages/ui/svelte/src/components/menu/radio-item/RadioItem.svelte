<script lang="ts">
	import { chainHandler, Dynamic, toControlAttrs, toRootForward, toRootProps } from '../../../adapter'
	import { Button } from '../../button'
	import { setupMenuRadioItem } from './setup.component'
	import type { MenuRadioItemAttributes, MenuRadioItemProps } from './base.component'

	let { ref = $bindable(), ...props }: MenuRadioItemProps = $props()
	const mountId = $props.id()

	const binding = setupMenuRadioItem(() => props, mountId, (node) => (ref = node))
	const state = binding.state
	const context = binding.context
	// Строка — экземпляр, которым владеет пункт (`TItemRow` на `div`): размер и выключенность ей
	// пишет пункт, а роль и `tabindex` — его набор `aria`
	const row = binding.ctrl.row
</script>

<!--
	Отметка — и у неотмеченного: обёртка держит колонку отметок. `aria-hidden`: состояние
	объявляет `aria-checked`. Обёртки без пробелов: пустую тема прячет по `:empty`.
-->
{#snippet mark()}
	{#if props['indicator-icon']}
		{@render props['indicator-icon']({ selected: state.selected ?? false })}
	{:else if state.selected}
		<span class="so-menu-item__dot"></span>
	{/if}
{/snippet}

{#if state.rendered}
	<Dynamic
		tag={state.tag}
		attributes={toRootProps(
			state,
			[state.dataset, state.attrs],
			toRootForward(binding.forwardProps),
		)}
		attach={binding.attachElement}
	>
		<Button
			embedded="menu.row"
			ctrl={row}
			{...state.aria}
			{...toControlAttrs<MenuRadioItemAttributes>(binding.forwardProps)}
			onclick={chainHandler(() => context?.adapters.menu.check(), binding.forwardProps.onclick)}
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
		</Button>
	</Dynamic>
{/if}
