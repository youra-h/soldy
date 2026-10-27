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
	Slots render by a call, without a block around: a slot costs one block, set or not, and the
	text falls back to `state.text` in the same block. The parts are glued: Svelte would keep a
	space between them as text.
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
	{@render props.leading?.()}<span class="so-button__text"
		>{@render (props.children ?? plain)({ text: state.text ?? '' })}</span
	>{@render props.trailing?.()}
</Dynamic>
