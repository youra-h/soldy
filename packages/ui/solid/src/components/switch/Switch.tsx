import type { JSX } from 'solid-js'
import {
	Elevate,
	Root,
	createPartProps,
	createRootProps,
	liveScope,
	renderSlot,
	toControlAttrs,
	toRootForward,
} from '../../adapter'
import { Show } from '../../adapter/runtime/flow'
import { setupSwitch } from './setup.component'
import type { SwitchAttributes, SwitchProps } from './base.component'

/** Переключатель: нативный `<input type="checkbox">` и дорожка; всё — `span` (кладут в `Label`). */
export function Switch(props: SwitchProps): JSX.Element {
	const binding = setupSwitch(props)
	const state = binding.state
	const ctrl = binding.ctrl
	const root = createRootProps(() => ({
		state,
		sets: [state.attrs, state.dataset],
		forward: toRootForward(binding.forwardProps()),
	}))
	const aria = createPartProps(() => state.aria)
	const control = createPartProps(() => toControlAttrs<SwitchAttributes>(binding.forwardProps()))
	const scope = liveScope(() => ({ value: state.value, ctrl }))

	return (
		<Show when={state.rendered}>
			<Root tag={state.tag} attributes={root} ref={binding.ref}>
				<Elevate layer={binding.layer}>
					<input
						type="checkbox"
						id={state.id}
						name={state.name}
						disabled={state.disabled}
						required={state.required}
						{...aria()}
						{...control()}
						checked={state.value}
					/>
					<span class="so-switch__track" aria-hidden="true">
						<span class="so-switch__track--thumb">
							<Show when={state.value} fallback={renderSlot(props.off, scope)}>
								{renderSlot(props.on, scope)}
							</Show>
						</span>
					</span>
				</Elevate>
			</Root>
		</Show>
	)
}
