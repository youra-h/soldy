<script lang="ts">
	import { Dynamic, roleIcon, toControlAttrs, toRootForward, toRootProps } from '../../../adapter'
	import { Button } from '../../button'
	import { Icon } from '../../icon'
	import { setupSelectItem } from './setup.component'
	import type { SelectItemAttributes, SelectItemProps } from './base.component'

	let { ref = $bindable(), ...props }: SelectItemProps = $props()
	const mountId = $props.id()

	const binding = setupSelectItem(() => props, mountId, (node) => (ref = node))
	const state = binding.state
	const context = binding.context

	const CHECK = roleIcon('check')

	/** Выбор — клик корня: клик потребителя стоит на строке и приходит раньше, всплытием. */
	function choose(): void {
		context?.adapters.select.choose()
	}
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
		attributes={{
			...toRootProps(state, [state.dataset, state.attrs], toRootForward(binding.forwardProps)),
			onclick: choose,
		}}
		attach={binding.attachElement}
	>
		<Button
			embedded="select.row"
			tag="span"
			tabindex={-1}
			size={state.size}
			variant={state.variant}
			disabled={state.disabled}
			{...state.aria}
			{...state.dataset}
			{...toControlAttrs<SelectItemAttributes>(binding.forwardProps)}
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
