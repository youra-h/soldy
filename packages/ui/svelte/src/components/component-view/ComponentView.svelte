<script lang="ts">
	import { setupComponentView } from './setup.component'
	import type { ComponentViewProps } from './base.component'

	const props: ComponentViewProps = $props()

	const binding = setupComponentView(() => props)
	const state = binding.state
</script>

<!-- ComponentView — рендерит динамический `tag` с классами из Core. -->
{#if state.rendered}
	<svelte:element
		this={state.tag as string}
		{...binding.forwardProps}
		class={[state.classes?.join(' '), binding.forwardProps.class].filter(Boolean).join(' ')}
		dir={state.dir ?? undefined}
		{@attach binding.attachElement}
		style:display={state.visible ? null : 'none'}
	>
		{@render props.children?.()}
	</svelte:element>
{/if}
