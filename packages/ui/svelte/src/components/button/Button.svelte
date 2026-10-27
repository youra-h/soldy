<script lang="ts">
	import { Dynamic, toRootProps } from '../../adapter'
	import { setupButton } from './setup.component'
	import type { ButtonProps } from './base.component'

	let { ref = $bindable(), ...props }: ButtonProps = $props()
	const mountId = $props.id()

	const binding = setupButton(() => props, mountId, (node) => (ref = node))
	const state = binding.state
</script>

<!--
	The content falls back to `state.text` in the block of the slot: owners (a tab, a section
	header) hand their markup to the button always. `leading` and `trailing` are usually not set,
	and a block by presence costs no branch then. The parts are glued: Svelte would keep a space
	between them as text.
-->
{#snippet plain()}{state.text}{/snippet}
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
	{#if props.leading}{@render props.leading()}{/if}<span class="so-button__text"
		>{@render (props.children ?? plain)({ text: state.text ?? '' })}</span
	>{#if props.trailing}{@render props.trailing()}{/if}
</Dynamic>
