<script lang="ts">
	import { Dynamic, toRootProps } from '../../../adapter'
	import { setupMenuSeparator } from './setup.component'
	import type { MenuSeparatorProps } from './base.component'

	let { ref = $bindable(), ...props }: MenuSeparatorProps = $props()
	const mountId = $props.id()

	const binding = setupMenuSeparator(() => props, mountId, (node) => (ref = node))
	const state = binding.state
</script>

<!--
	MenuSeparator — линия между группами пунктов, как `Menu.Separator` у Vue:
	корень по `tag` с тремя наборами ядра — `role="separator"` от ядра.
	Навигация его пропускает — в коллекцию меню разделитель не входит. Внутри
	ничего не рисуется.
-->
{#if state.rendered}
	<Dynamic
		tag={state.tag}
		attributes={toRootProps(
			state,
			[state.attrs, state.aria, state.dataset],
			binding.forwardProps,
		)}
		attach={binding.attachElement}
	/>
{/if}
