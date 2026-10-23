<script lang="ts">
	import { Dynamic, toRootProps } from '../../../adapter'
	import { setupTabsContent } from './setup.component'
	import type { TabsContentProps } from './base.component'

	let { ref = $bindable(), ...props }: TabsContentProps = $props()
	const mountId = $props.id()

	const binding = setupTabsContent(() => props, mountId, (node) => (ref = node))
	const state = binding.state
</script>

<!-- Рисуется, пока активен таб того же `value`; панель без такого таба пуста. -->
{#if state.rendered && state.active}
	<Dynamic
		tag={state.tag}
		attributes={toRootProps(state, [state.attrs, state.aria], binding.forwardProps)}
		attach={binding.attachElement}
	>
		{@render props.children?.()}
	</Dynamic>
{/if}
