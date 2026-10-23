import type { JSX } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import { createRootProps, rootTag } from '../../../adapter'
import { Show } from '../../../adapter/runtime/flow'
import { setupMenuSeparator } from './setup.component'
import type { MenuSeparatorProps } from './base.component'

/** Разделитель меню: корень без содержимого. */
export function MenuSeparator(props: MenuSeparatorProps): JSX.Element {
	const binding = setupMenuSeparator(props)
	const state = binding.state
	const root = createRootProps(() => ({
		state,
		sets: [state.attrs, state.aria, state.dataset],
		forward: binding.forwardProps(),
	}))

	return (
		<Show when={state.rendered}>
			<Dynamic {...root()} component={rootTag(state.tag)} ref={binding.ref} />
		</Show>
	)
}
