<script lang="ts">
	import type { Snippet } from 'svelte'
	import { chainHandler, Dynamic, roleIcon, toControlAttrs, toRootForward, toRootProps } from '../../../adapter'
	import { Button } from '../../button'
	import { Icon } from '../../icon'
	import { setupAccordionItem } from './setup.component'
	import type { AccordionItemAttributes, AccordionItemProps } from './base.component'

	let { ref = $bindable(), ...props }: AccordionItemProps = $props()
	const mountId = $props.id()

	const binding = setupAccordionItem(() => props, mountId, (node) => (ref = node))
	const state = binding.state
	const context = binding.context

	const ARROW = roleIcon('arrowRight')
</script>

<!--
	Класс стрелки — на обёртке, а не на иконке: тема поворачивает стрелку раскрытой секции по
	`.so-accordion-item__arrow`, и подменённая слотом иконка поворачивается так же. Обёртка
	стоит, пока на её стороне стрелка по умолчанию или задан слот.
-->
{#snippet arrow(side: 'start' | 'end', slot: Snippet | undefined)}
	{#if slot || state.arrowPlacement === side}
		<span class="so-accordion-item__arrow">
			{#if slot}
				{@render slot()}
			{:else}
				<Icon embedded="accordion.arrow" tag={ARROW} size={state.size} />
			{/if}
		</span>
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
	<Button
		embedded="accordion.header"
		type="button"
		class="so-accordion-item__header"
		view={state.view}
		disabled={state.disabled}
		size={state.size}
		variant={state.variant}
		{...state.aria}
		{...toControlAttrs<AccordionItemAttributes>(binding.forwardProps)}
		onclick={chainHandler(() => context?.adapters.selection.toggle(), binding.forwardProps.onclick)}
	>
		{#snippet leading()}
			{@render arrow('start', props['leading-icon'])}{@render props.leading?.()}
		{/snippet}
		{#if props.header}
			{@render props.header({
				text: state.text ?? '',
				selected: state.selected ?? false,
			})}
		{:else}
			{state.text}
		{/if}
		{#snippet trailing()}
			{@render props.trailing?.()}{@render arrow('end', props['trailing-icon'])}
		{/snippet}
	</Button><div class="so-accordion-item__body">
		<div class="so-accordion-item__content" {...state.contentAria}>
			{@render props.children?.()}
		</div>
	</div>
</Dynamic>
