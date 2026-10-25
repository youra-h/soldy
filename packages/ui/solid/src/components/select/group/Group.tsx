import type { JSX } from 'solid-js'
import { Elevate, Root, createPartProps, createRootProps, renderSlot } from '../../../adapter'
import { Show } from '../../../adapter/runtime/flow'
import { setupSelectGroup } from './setup.component'
import type { SelectGroupProps } from './base.component'

/** Опции списка панели под общей подписью `label`; без подписи нет и её узла. */
export function SelectGroup(props: SelectGroupProps): JSX.Element {
	const binding = setupSelectGroup(props)
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
					<div class="so-select-group__label" {...labelAria()}>
						{state.label}
					</div>
				</Show>
				<Elevate layer={binding.layer}>{renderSlot(props.children)}</Elevate>
			</Root>
		</Show>
	)
}
