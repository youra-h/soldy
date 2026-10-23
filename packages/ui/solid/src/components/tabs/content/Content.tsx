import type { JSX } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import { createRootProps, renderSlot, rootTag } from '../../../adapter'
import { Show } from '../../../adapter/runtime/flow'
import { setupTabsContent } from './setup.component'
import type { TabsContentProps } from './base.component'

/** Панель таба: рисуется, пока активен таб того же `value`; без такого таба пуста. */
export function TabsContent(props: TabsContentProps): JSX.Element {
	const binding = setupTabsContent(props)
	const state = binding.state
	const root = createRootProps(() => ({
		state,
		sets: [state.attrs, state.aria],
		forward: binding.forwardProps(),
	}))

	return (
		<Show when={state.rendered && state.active}>
			<Dynamic {...root()} component={rootTag(state.tag)} ref={binding.ref}>
				{renderSlot(props.children)}
			</Dynamic>
		</Show>
	)
}
