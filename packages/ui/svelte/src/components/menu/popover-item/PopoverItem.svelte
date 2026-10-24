<script lang="ts">
	import { chainHandler, Dynamic, roleIcon, toControlAttrs, toRootForward, toRootProps } from '../../../adapter'
	import { Button } from '../../button'
	import { Frame } from '../../frame'
	import { Icon } from '../../icon'
	import { setupMenuPopoverItem } from './setup.component'
	import type { MenuPopoverItemAttributes, MenuPopoverItemProps } from './base.component'

	let { ref = $bindable(), ...props }: MenuPopoverItemProps = $props()
	const mountId = $props.id()

	const binding = setupMenuPopoverItem(() => props, mountId, (node) => (ref = node))
	const state = binding.state
	const context = binding.context
	// Строка — экземпляр, которым владеет пункт (`TItemRow` на `div`): размер и выключенность ей
	// пишет пункт, а роль и `tabindex` — его набор `aria`
	const row = binding.ctrl.row

	const ARROW = roleIcon('arrowRight')
</script>

<!--
	Текст строки — сниппет `header`, а не `children`: `children` — содержимое панели.
	Открытость — `visible` панели, а не `rendered`; `lazyMount` действует только на содержимое.
	Части и обёртка значка — вплотную: пробел между блоками Svelte оставил бы текст, а пустой
	значок тема прячет по `:empty`.
-->
{#snippet arrowIcon()}
	{#if props['arrow-icon']}
		{@render props['arrow-icon']()}
	{:else}
		<Icon embedded="menu.arrow" tag={ARROW} size={state.size} />
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
			{...toControlAttrs<MenuPopoverItemAttributes>(binding.forwardProps)}
			onclick={chainHandler(() => context?.adapters.menu.open(), binding.forwardProps.onclick)}
		>
			{#snippet leading()}
				<span class="so-menu-item__icon">{@render props.leading?.()}</span>
			{/snippet}
			{#if props.header}
				{@render props.header({ text: state.text ?? '', open: state.open ?? false })}
			{:else}
				{state.text}
			{/if}
			{#snippet trailing()}
				<span class="so-menu-item__arrow" aria-hidden="true">{@render arrowIcon()}</span>
			{/snippet}
		</Button><Frame
			embedded="menu.popover-item-frame"
			class="so-menu-item__panel"
			tabindex={-1}
			visible={state.open}
			position="fixed"
			anchor_anchor={binding.rootElement}
			anchor_placement="end-start"
			{...state.panelAria}
			{...state.dismiss_ownerAttribute}
		>
			<div class="so-menu-item__content">
				{#if state.contentRendered}{@render props.children?.()}{/if}
			</div>
		</Frame>
	</Dynamic>
{/if}
