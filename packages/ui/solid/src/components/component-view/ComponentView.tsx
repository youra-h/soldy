import type { JSX } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import { createRootProps, renderSlot, rootTag } from '../../adapter'
import { Show } from '../../adapter/runtime/flow'
import { setupComponentView } from './setup.component'
import type { ComponentViewProps } from './base.component'

/** Визуальная база: корень по `tag` с наборами ядра — их пишут наследники (Icon, Skeleton). */
export function ComponentView(props: ComponentViewProps): JSX.Element {
	const binding = setupComponentView(props)
	const state = binding.state
	const root = createRootProps(() => ({
		state,
		sets: [state.attrs, state.aria, state.dataset],
		forward: binding.forwardProps(),
	}))

	return (
		<Show when={state.rendered}>
			<Dynamic {...root()} component={rootTag(state.tag)} ref={binding.ref}>
				{renderSlot(props.children)}
			</Dynamic>
		</Show>
	)
}
