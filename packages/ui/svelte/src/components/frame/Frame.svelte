<script lang="ts">
	import { Dynamic, Teleport, toRootProps } from '../../adapter'
	import { setupFrame } from './setup.component'
	import type { FrameProps } from './base.component'

	let { ref = $bindable(), ...props }: FrameProps = $props()
	const mountId = $props.id()

	const binding = setupFrame(() => props, mountId, (node) => (ref = node))
	const state = binding.state
</script>

{#if state.rendered}
	<Teleport to={state.target} disabled={state.contained}>
		<Dynamic
			tag={state.tag}
			attributes={toRootProps(
				state,
				[state.attrs, state.aria, state.dataset],
				binding.forwardProps,
			)}
			attach={binding.attachElement}
		>
			{@render props.children?.()}
		</Dynamic>
	</Teleport>
{/if}
