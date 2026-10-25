import type { JSX } from 'solid-js'
import { Root, createRootProps, renderSlot, resolveSlot } from '../../adapter'
import { Show } from '../../adapter/runtime/flow'
import { setupButton } from './setup.component'
import type { ButtonProps } from './base.component'

/** Кнопка: на месте незаданного `children` — текст из ядра. */
export function Button(props: ButtonProps): JSX.Element {
	return renderButton(setupButton(props), props)
}

/** Что разметке кнопки нужно от её связки. */
export type TButtonBinding = Pick<ReturnType<typeof setupButton>, 'ref' | 'forwardProps' | 'state'>

/**
 * Разметка кнопки по её связке. Одна на Button и строку элемента коллекции
 * (`ItemRow`): у них разная сборка, а разметка та же.
 */
export function renderButton(binding: TButtonBinding, props: ButtonProps): JSX.Element {
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
			<Root tag={state.tag} attributes={root} ref={binding.ref}>
				{renderSlot(props.leading)}
				<span class="so-button__text">{content() ?? state.text}</span>
				{renderSlot(props.trailing)}
			</Root>
		</Show>
	)
}
