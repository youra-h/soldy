import type { JSX } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import { createRootProps, renderSlot, resolveSlot, rootTag } from '../../adapter'
import { Show } from '../../adapter/runtime/flow'
import { setupButton } from './setup.component'
import type { ButtonProps } from './base.component'

/** Кнопка: на месте незаданного `children` — текст из ядра. */
export function Button(props: ButtonProps): JSX.Element {
	const binding = setupButton(props)
	const state = binding.state
	const root = createRootProps(() => ({
		state,
		sets: [state.attrs, state.aria, state.dataset],
		forward: binding.forwardProps(),
	}))
	const content = resolveSlot(
		() => props.children,
		() => ({ text: state.text ?? '' }),
	)

	return (
		<Show when={state.rendered}>
			<Dynamic {...root()} component={rootTag(state.tag)} ref={binding.ref}>
				{renderSlot(props.leading)}
				<span class="so-button__text">{content() ?? state.text}</span>
				{renderSlot(props.trailing)}
			</Dynamic>
		</Show>
	)
}
