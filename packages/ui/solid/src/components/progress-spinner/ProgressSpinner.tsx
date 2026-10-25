import type { JSX } from 'solid-js'
import { Root, createRootProps } from '../../adapter'
import { Show } from '../../adapter/runtime/flow'
import { setupProgressSpinner } from './setup.component'
import type { ProgressSpinnerProps } from './base.component'

/** Индикатор выполнения кольцом; корень — `span`: кольцо кладут в `Button` и `Label`. */
export function ProgressSpinner(props: ProgressSpinnerProps): JSX.Element {
	const binding = setupProgressSpinner(props)
	const state = binding.state
	const root = createRootProps(() => ({
		state,
		sets: [state.attrs, state.aria, state.dataset],
		forward: binding.forwardProps(),
		style: state.fractionStyle,
	}))

	return (
		<Show when={state.rendered}>
			<Root tag={state.tag} attributes={root} ref={binding.ref}>
				{/*
					Три окружности одной геометрии: центр поля 16 × 16, радиус 7 — при толщине
					темы 2 кольцо ровно касается краёв поля. Дуги меряются долями (`pathLength`).
				*/}
				<svg class="so-progress-spinner__ring" viewBox="0 0 16 16" aria-hidden="true">
					<circle class="so-progress-spinner__track" cx="8" cy="8" r="7" />
					<circle class="so-progress-spinner__range" cx="8" cy="8" r="7" pathLength="1" />
					<circle
						class="so-progress-spinner__runner"
						cx="8"
						cy="8"
						r="7"
						pathLength="1"
					/>
				</svg>
			</Root>
		</Show>
	)
}
