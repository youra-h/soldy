import type { JSX } from 'solid-js'
import { Root, createRootProps, renderSlot } from '../../../adapter'
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
			<Root tag={state.tag} attributes={root} ref={binding.ref}>
				{renderSlot(props.children)}
			</Root>
		</Show>
	)
}
