<script lang="ts">
	import { chainHandler, Dynamic, toControlAttrs, toRootForward, toRootProps } from '../../../adapter'
	import { Button } from '../../button'
	import { setupMenuItem } from './setup.component'
	import type { MenuItemAttributes, MenuItemProps } from './base.component'

	let { ref = $bindable(), ...props }: MenuItemProps = $props()
	const mountId = $props.id()

	const binding = setupMenuItem(() => props, mountId, (node) => (ref = node))
	const state = binding.state
	const context = binding.context
	// Строка — экземпляр, которым владеет пункт (`TItemRow` на `div`): размер и выключенность ей
	// пишет пункт, а роль и `tabindex` — его набор `aria`
	const row = binding.ctrl.row
</script>

<!-- Обёртки значка и сочетания — у каждого пункта, без пробелов: пустую тема прячет по `:empty`. -->
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
			{...toControlAttrs<MenuItemAttributes>(binding.forwardProps)}
			onclick={chainHandler(() => context?.adapters.menu.choose(), binding.forwardProps.onclick)}
		>
			{#snippet leading()}
				<span class="so-menu-item__icon">{@render props.leading?.()}</span>
			{/snippet}
			{#if props.children}
				{@render props.children({ text: state.text ?? '' })}
			{:else}
				{state.text}
			{/if}
			{#snippet trailing()}
				<span class="so-menu-item__shortcut">{@render props.trailing?.()}</span>
			{/snippet}
		</Button>
	</Dynamic>
{/if}
