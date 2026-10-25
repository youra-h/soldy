import type { JSX } from 'solid-js'
import { Elevate, Root, createPartProps, createRootProps, renderSlot } from '../../../adapter'
import { Show } from '../../../adapter/runtime/flow'
import { setupListBoxGroup } from './setup.component'
import type { ListBoxGroupProps } from './base.component'

/** Элементы списка под общей подписью: ключ группы элементы читают из её слоя (`Elevate`). */
export function ListBoxGroup(props: ListBoxGroupProps): JSX.Element {
	const binding = setupListBoxGroup(props)
	const state = binding.state
	const root = createRootProps(() => ({
		state,
		sets: [state.attrs, state.aria, state.dataset],
		forward: binding.forwardProps(),
	}))
	const labelAria = createPartProps(() => state.labelAria)

	return (
		<Show when={state.rendered}>
			<Root tag={state.tag} attributes={root} ref={binding.ref}>
				<Show when={state.label}>
					<div class="so-list-box-group__label" {...labelAria()}>
						{state.label}
					</div>
				</Show>
				<Elevate layer={binding.layer}>{renderSlot(props.children)}</Elevate>
			</Root>
		</Show>
	)
}
