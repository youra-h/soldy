<script lang="ts">
	import { Dynamic, toRootProps } from '../../adapter'
	import { setupLabel } from './setup.component'
	import type { LabelProps } from './base.component'

	let { ref = $bindable(), ...props }: LabelProps = $props()
	const mountId = $props.id()

	const binding = setupLabel(() => props, mountId, (node) => (ref = node))
	const state = binding.state
</script>

<!--
	Label — без `for` и `id`: контрол — первый labelable-потомок `label`. Внутри только
	`span`: `div` и вложенный `label` HTML запрещает. Пустой текст не рисуется вовсе: метку
	блока Svelte — комментарий — `:empty` темы не видит. Части вплотную: пробел между
	соседями Svelte оставил бы.
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
	>
		<span class="so-label__control">{@render props.children?.()}</span><span
			class="so-label__text"
		>
			{#if props.content}
				{@render props.content()}
			{:else if state.text}
				{state.text}
			{/if}
		</span>
	</Dynamic>
{/if}
