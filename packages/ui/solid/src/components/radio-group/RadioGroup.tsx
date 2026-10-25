import type { JSX } from 'solid-js'
import { Elevate, ResolvedSlot, Root, createRootProps, relaySlot } from '../../adapter'
import { For, Show } from '../../adapter/runtime/flow'
import { RadioGroupItem } from './item'
import { setupRadioGroup } from './setup.component'
import type { RadioGroupProps } from './base.component'

/** Группа радио: радио — содержимое или `shown`. */
export function RadioGroup(props: RadioGroupProps): JSX.Element {
	const binding = setupRadioGroup(props)
	const state = binding.state
	const root = createRootProps(() => ({
		state,
		sets: [state.attrs, state.aria, state.dataset],
		forward: binding.forwardProps(),
	}))

	return (
		<Show when={state.rendered}>
			<Root tag={state.tag} attributes={root} ref={binding.ref}>
				<Elevate layer={binding.layer}>
					<ResolvedSlot
						content={props.children}
						fallback={
							<For each={state.shown}>
								{(item) => (
									<RadioGroupItem ctrl={item}>
										{relaySlot(props.item, { item })}
									</RadioGroupItem>
								)}
							</For>
						}
					/>
				</Elevate>
			</Root>
		</Show>
	)
}
