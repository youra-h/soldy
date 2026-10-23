import type { JSX } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import { createRootProps, rootTag } from '../../adapter'
import { Show } from '../../adapter/runtime/flow'
import { setupProgressLinear } from './setup.component'
import type { ProgressLinearProps } from './base.component'

/** Индикатор выполнения линией: корень — дорожка с заливкой; всё — `span` (кладут в `Label`). */
export function ProgressLinear(props: ProgressLinearProps): JSX.Element {
	const binding = setupProgressLinear(props)
	const state = binding.state
	const root = createRootProps(() => ({
		state,
		sets: [state.attrs, state.aria, state.dataset],
		forward: binding.forwardProps(),
		style: state.percentStyle,
	}))

	return (
		<Show when={state.rendered}>
			<Dynamic {...root()} component={rootTag(state.tag)} ref={binding.ref}>
				{/* Бегущий отрезок тема рисует псевдоэлементом корня — своего узла у него нет. */}
				<span class="so-progress-linear__range" />
			</Dynamic>
		</Show>
	)
}
