<script lang="ts">
	import { Dynamic, toRootProps } from '../../adapter'
	import { Frame } from '../frame'
	import { setupTooltip } from './setup.component'
	import type { TooltipProps } from './base.component'

	let { ref = $bindable(), ...props }: TooltipProps = $props()
	const mountId = $props.id()

	const binding = setupTooltip(() => props, mountId, (node) => (ref = node))
	const state = binding.state
</script>

<!--
	В корне только триггер: курсор на триггере — курсор на корне, цели наведения. Триггер и панель
	стоят вплотную: пробел Svelte оставил бы в корне текстом.
-->
<Dynamic
	rendered={state.rendered}
	tag={state.tag}
	attributes={toRootProps(state, [state.attrs, state.dataset], binding.forwardProps)}
	attach={binding.attachElement}
>
	{@render props.trigger?.({ triggerAria: state.triggerAria ?? {} })}<Frame
		embedded="tooltip.frame"
		class="so-tooltip__panel"
		visible={state.open}
		position="fixed"
		anchor_anchor={binding.rootElement}
		anchor_placement={state.placement}
		anchor_offset={6}
		{...state.aria}
		{...state.dismiss_ownerAttribute}
	>
		<div class="so-tooltip__content">{@render props.children?.()}</div>
	</Frame>
</Dynamic>
