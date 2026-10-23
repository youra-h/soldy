import type { JSX } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import { createRootProps, renderSlot, resolveSlot, rootTag } from '../../adapter'
import { Show } from '../../adapter/runtime/flow'
import { setupLabel } from './setup.component'
import type { LabelProps } from './base.component'

/**
 * Подпись контрола: контрол — первый labelable-потомок `label`, внутри — только `span`.
 * Пустой текст не рисуется вовсе: Solid оставил бы от снятого текста пустой
 * текстовый узел, и тема не спрятала бы обёртку по `:empty`.
 */
export function Label(props: LabelProps): JSX.Element {
	const binding = setupLabel(props)
	const state = binding.state
	const root = createRootProps(() => ({
		state,
		sets: [state.attrs, state.aria, state.dataset],
		forward: binding.forwardProps(),
	}))
	const content = resolveSlot(
		() => props.content,
		() => ({}),
	)

	return (
		<Show when={state.rendered}>
			<Dynamic {...root()} component={rootTag(state.tag)} ref={binding.ref}>
				<span class="so-label__control">{renderSlot(props.children)}</span>
				<span class="so-label__text">{content() ?? (state.text || undefined)}</span>
			</Dynamic>
		</Show>
	)
}
