<script lang="ts">
	import { Dynamic, toRootProps } from '../../adapter'
	import { setupProgressSpinner } from './setup.component'
	import type { ProgressSpinnerProps } from './base.component'

	let { ref = $bindable(), ...props }: ProgressSpinnerProps = $props()
	const mountId = $props.id()

	const binding = setupProgressSpinner(() => props, mountId, (node) => (ref = node))
	const state = binding.state
</script>

<!--
	Корень по умолчанию `span`: кольцо кладут в `Button` и `Label`, где HTML разрешает только
	строчную разметку. Рисунок — декор под `aria-hidden`. Поле 16 × 16, радиус 7: при толщине
	темы 2 кольцо касается краёв. `pathLength="1"`: доля из переменной корня ложится в штрих
	как есть.
-->
{#if state.rendered}
	<Dynamic
		tag={state.tag}
		attributes={toRootProps(
			state,
			[state.attrs, state.aria, state.dataset],
			binding.forwardProps,
			state.fractionStyle,
		)}
		attach={binding.attachElement}
	>
		<svg class="so-progress-spinner__ring" viewBox="0 0 16 16" aria-hidden="true">
			<circle class="so-progress-spinner__track" cx="8" cy="8" r="7" />
			<circle class="so-progress-spinner__range" cx="8" cy="8" r="7" pathLength="1" />
			<circle class="so-progress-spinner__runner" cx="8" cy="8" r="7" pathLength="1" />
		</svg>
	</Dynamic>
{/if}
