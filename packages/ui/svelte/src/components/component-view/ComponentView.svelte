<script lang="ts">
	import { setupComponentView } from './setup.component'
	import type { ComponentViewProps } from './base.component'

	const props: ComponentViewProps = $props()

	const binding = setupComponentView(() => props)
	const state = binding.state
</script>

<!--
	ComponentView — рендерит динамический `tag` с классами из Core.

	`attrs`/`aria`/`dataset` — три набора ядра раскладываются на корень, как у
	Button: сам по себе ComponentView не пишет в них ничего, но наследники
	(Icon, Spinner, …) пишут, и без раскладки здесь запись до DOM не доходит.
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
		{@render props.children?.()}
	</svelte:element>
{/if}
