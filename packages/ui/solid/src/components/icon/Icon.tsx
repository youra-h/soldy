import type { JSX } from 'solid-js'
import { Root, createRootProps } from '../../adapter'
import { Show } from '../../adapter/runtime/flow'
import { setupIcon } from './setup.component'
import type { IconProps } from './base.component'

/**
 * Иконка: корень по `tag` без содержимого. Компонент в `tag` обязан положить на свой
 * корень `ref`, `class`, `style` и ARIA — иначе нет `element:ready`, размера и скрытия.
 */
export function Icon(props: IconProps): JSX.Element {
	const binding = setupIcon(props)
	const state = binding.state
	const root = createRootProps(() => ({
		state,
		sets: [state.attrs, state.aria],
		forward: binding.forwardProps(),
	}))

	return (
		<Show when={state.rendered}>
			<Root tag={state.tag} attributes={root} ref={binding.ref} />
		</Show>
	)
}
