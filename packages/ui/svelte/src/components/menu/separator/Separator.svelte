<script lang="ts">
	import { Dynamic, toRootProps } from '../../../adapter'
	import { setupMenuSeparator } from './setup.component'
	import type { MenuSeparatorProps } from './base.component'

	let { ref = $bindable(), ...props }: MenuSeparatorProps = $props()
	const mountId = $props.id()

	const binding = setupMenuSeparator(() => props, mountId, (node) => (ref = node))
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
/>
