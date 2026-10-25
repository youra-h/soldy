import type { JSX } from 'solid-js'
import { Root, Teleport, createRootProps, renderSlot } from '../../adapter'
import { Show } from '../../adapter/runtime/flow'
import { setupFrame } from './setup.component'
import type { FrameProps } from './base.component'

/** Слой поверх страницы: корень уходит телепортом в `target`, `contained` телепорт выключает. */
export function Frame(props: FrameProps): JSX.Element {
	const binding = setupFrame(props)
	const state = binding.state
	const root = createRootProps(() => ({
		state,
		sets: [state.attrs, state.aria, state.dataset],
		forward: binding.forwardProps(),
	}))

	return (
		<Show when={state.rendered}>
			<Teleport to={state.target} disabled={state.contained}>
				<Root tag={state.tag} attributes={root} ref={binding.ref}>
					{renderSlot(props.children)}
				</Root>
			</Teleport>
		</Show>
	)
}
