<script lang="ts">
	import { Dynamic, toRootProps } from '../../adapter'
	import { setupComponentView } from './setup.component'
	import type { ComponentViewProps } from './base.component'

	let { ref = $bindable(), ...props }: ComponentViewProps = $props()
	const mountId = $props.id()

	const binding = setupComponentView(() => props, mountId, (node) => (ref = node))
	const state = binding.state
</script>

<!-- Наборы ядра раскладываются и здесь: сам ComponentView в них не пишет, пишут наследники. -->
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
	{@render props.children?.()}
</Dynamic>
