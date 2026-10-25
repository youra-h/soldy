import type { JSX } from 'solid-js'
import { Elevate, Root, Teleport, createRootProps, relaySlot, renderSlot } from '../../adapter'
import { For, Show } from '../../adapter/runtime/flow'
import { ToastsItem } from './item'
import { setupToasts } from './setup.component'
import type { ToastsProps } from './base.component'

/**
 * Менеджер тостов: `children` — приложение, регион с тостами — телепортом в `target`.
 * Оба — в слое лифта менеджера: API тостов и движок берут из него.
 */
export function Toasts(props: ToastsProps): JSX.Element {
	const binding = setupToasts(props)
	const state = binding.state
	const root = createRootProps(() => ({
		state,
		sets: [state.attrs, state.aria, state.dataset],
		forward: binding.forwardProps(),
	}))

	return (
		<Elevate layer={binding.layer}>
			{renderSlot(props.children)}
			<Show when={state.rendered}>
				<Teleport to={state.target}>
					<Root tag={state.tag} attributes={root} ref={binding.ref}>
						<ol class="so-toasts__list">
							<For each={state.shown}>
								{(item) => (
									<ToastsItem
										ctrl={item}
										icon={relaySlot(props['item-icon'], { item })}
										content={renderSlot(props['item-content'], { item })}
										close-icon={renderSlot(props['item-close-icon'], { item })}
									>
										{relaySlot(props.item, { item })}
									</ToastsItem>
								)}
							</For>
						</ol>
					</Root>
				</Teleport>
			</Show>
		</Elevate>
	)
}
