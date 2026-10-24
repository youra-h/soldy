<script lang="ts">
	import { chainHandler, Dynamic, roleIcon, toControlAttrs, toRootForward, toRootProps } from '../../../adapter'
	import { Button } from '../../button'
	import { Icon } from '../../icon'
	import { setupListBoxItem } from './setup.component'
	import type { ListBoxItemAttributes, ListBoxItemProps } from './base.component'

	let { ref = $bindable(), ...props }: ListBoxItemProps = $props()
	const mountId = $props.id()

	const binding = setupListBoxItem(() => props, mountId, (node) => (ref = node))
	const state = binding.state
	const context = binding.context
	// Строка — экземпляр, которым владеет элемент (`TItemRow` на `div`): размер, вариант,
	// выключенность и вид ей пишет элемент, а роль и `tabindex` — его набор `aria`
	const row = binding.ctrl.row

	const CHECK = roleIcon('check')
</script>

<!--
	Тег строки задаёт её экземпляр (`div`): под него написан `TListBoxItem._ariaTag`. Своих роли
	и `tabindex` у строки нет — `tabindex="-1"` пишет ей список набором элемента.
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
			embedded="list-box.row"
			ctrl={row}
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
		</Button>
	</Dynamic>
{/if}
