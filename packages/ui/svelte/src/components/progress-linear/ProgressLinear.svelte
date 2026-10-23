<script lang="ts">
	import { Dynamic, toRootProps } from '../../adapter'
	import { setupProgressLinear } from './setup.component'
	import type { ProgressLinearProps } from './base.component'

	let { ref = $bindable(), ...props }: ProgressLinearProps = $props()
	const mountId = $props.id()

	const binding = setupProgressLinear(() => props, mountId, (node) => (ref = node))
	const state = binding.state
</script>

<!--
	Корень по умолчанию `span`, и заливка тоже: полосу кладут в `Button` и `Label`, где HTML
	разрешает только строчную разметку. Бег тема рисует псевдоэлементом корня, своего узла нет.
-->
{#if state.rendered}
	<Dynamic
		tag={state.tag}
		attributes={toRootProps(
			state,
			[state.attrs, state.aria, state.dataset],
			binding.forwardProps,
			state.percentStyle,
		)}
		attach={binding.attachElement}
	>
		<span class="so-progress-linear__range"></span>
	</Dynamic>
{/if}
