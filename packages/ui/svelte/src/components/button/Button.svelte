<script lang="ts">
	import { setupButton } from './setup.component'
	import type { ButtonProps } from './base.component'

	const props: ButtonProps = $props()

	const binding = setupButton(() => props)
	const state = binding.state
</script>

<!--
	Button — рендерит кнопку с текстом из Core.

	- `tag` по умолчанию `button` (из TButton.defaultValues)
	- disabled → нативный `disabled` (`attrs`) или `aria-disabled` (`aria`) по
	  тегу, `data-disabled` для темы (`dataset`) — на любом теге

	Слоты объявлены в контракте (ButtonContribution) и одинаковы во всех
	адаптерах: `leading`, `default` (здесь — `children`, со scope `{ text }`),
	`trailing`.
-->
{#if state.rendered}
	<svelte:element
		this={state.tag as string}
		{...binding.forwardProps}
		class={[state.classes?.join(' '), binding.forwardProps.class].filter(Boolean).join(' ')}
		{...state.attrs}
		{...state.aria}
		{...state.dataset}
		{@attach binding.attachElement}
		style:display={state.visible ? null : 'none'}
	>
		{#if props.leading}{@render props.leading()}{/if}
		<span class="s-button__text">
			{#if props.children}{@render props.children({ text: state.text ?? '' })}{:else}{state.text}{/if}
		</span>
		{#if props.trailing}{@render props.trailing()}{/if}
	</svelte:element>
{/if}
