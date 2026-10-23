<script lang="ts">
	import { Dynamic, toRootProps } from '../../adapter'
	import { setupIcon } from './setup.component'
	import type { IconProps } from './base.component'

	let { ref = $bindable(), ...props }: IconProps = $props()
	const mountId = $props.id()

	const binding = setupIcon(() => props, mountId, (node) => (ref = node))
	const state = binding.state
</script>

<!--
	Без содержимого: картинку рисует сам тег. Компонент Svelte в `tag` получает атрибуты корня
	и привязку пропсами и обязан положить их на свой корень.
-->
{#if state.rendered}
	<Dynamic
		tag={state.tag}
		attributes={toRootProps(state, [state.attrs, state.aria], binding.forwardProps)}
		attach={binding.attachElement}
	/>
{/if}
