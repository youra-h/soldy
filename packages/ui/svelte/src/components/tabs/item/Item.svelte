<script lang="ts">
	import { chainHandler, Dynamic, roleIcon, toControlAttrs, toRootForward, toRootProps } from '../../../adapter'
	import { Button } from '../../button'
	import { Icon } from '../../icon'
	import { setupTabsItem } from './setup.component'
	import type { TabsItemAttributes, TabsItemProps } from './base.component'

	let { ref = $bindable(), ...props }: TabsItemProps = $props()
	const mountId = $props.id()

	const binding = setupTabsItem(() => props, mountId, (node) => (ref = node))
	const state = binding.state
	const context = binding.context

	const CLOSE = roleIcon('close')


	// Нативный клик `TActionPlugin`, а не `onclick`: тот Svelte делегирует корню приложения, и
	// событие прошло бы корни таба и набора — их `TActionPlugin` отдал бы `action:press`
	function close(event: MouseEvent): void {
		event.stopPropagation()
		context?.adapters.tabs.close()
	}
</script>

<!--
	Крестик — сосед строки: интерактивный потомок у `<button role="tab">` HTML запрещает, а его
	подпись вошла бы в имя таба. Строка и крестик вплотную: пробел Svelte оставил бы текстом.
-->
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
			embedded="tabs.row"
			type="button"
			disabled={state.disabled}
			size={state.size}
			variant={state.variant}
			leading={props.leading}
			trailing={props.trailing}
			{...state.aria}
			{...toControlAttrs<TabsItemAttributes>(binding.forwardProps)}
			onclick={chainHandler(() => {
				if (context) context.adapters.activation.active = true
			}, binding.forwardProps.onclick)}
		>
			{#if props.children}
				{@render props.children({ text: state.text ?? '', active: state.active ?? false })}
			{:else}
				{state.text}
			{/if}
		</Button><Button
			embedded="tabs.close"
			type="button"
			rendered={state.tab_closable === true}
			class="so-tabs-item__close"
			disabled={state.disabled}
			size={state.size}
			{...state.closeAria}
			onActionClick={close}
		>
			{#if props['close-icon']}
				{@render props['close-icon']()}
			{:else}
				<Icon embedded="tabs.close-icon" tag={CLOSE} size={state.size} />
			{/if}
		</Button>
	</Dynamic>
{/if}
