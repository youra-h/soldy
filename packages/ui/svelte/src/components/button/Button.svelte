<script lang="ts">
	import { Dynamic, toRootProps } from '../../adapter'
	import { setupButton } from './setup.component'
	import type { ButtonProps } from './base.component'

	let { ref = $bindable(), ...props }: ButtonProps = $props()
	const mountId = $props.id()

	const binding = setupButton(() => props, mountId, (node) => (ref = node))
	const state = binding.state
</script>

<Dynamic
	rendered={state.rendered}
	tag={state.tag}
	attributes={toRootProps(
		state,
		[state.attrs, state.aria, state.dataset],
		binding.forwardProps,
	)}
	attach={binding.attachElement}
>
	{#if props.leading}{@render props.leading()}{/if}
	<span class="so-button__text">
		{#if props.children}{@render props.children({ text: state.text ?? '' })}{:else}{state.text}{/if}
	</span>
	{#if props.trailing}{@render props.trailing()}{/if}
</Dynamic>
