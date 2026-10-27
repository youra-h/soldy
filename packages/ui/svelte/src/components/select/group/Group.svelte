<script lang="ts">
	import { Dynamic, toRootProps } from '../../../adapter'
	import { setupSelectGroup } from './setup.component'
	import type { SelectGroupProps } from './base.component'

	let { ref = $bindable(), ...props }: SelectGroupProps = $props()
	const mountId = $props.id()

	const binding = setupSelectGroup(() => props, mountId, (node) => (ref = node))
	const state = binding.state
</script>

<!-- Части вплотную: пробел между блоками Svelte оставил бы в группе текстом. -->
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
	{#if state.label}<div class="so-select-group__label" {...state.labelAria}>
			{state.label}
		</div>{/if}{@render props.children?.()}
</Dynamic>
