import type { JSX } from 'solid-js'
import { Root, clickAction, createRootProps, resolveSlot } from '../../../adapter'
import { Show } from '../../../adapter/runtime/flow'
import { Button } from '../../button'
import { setupPaginationItem } from './setup.component'
import type { PaginationItemProps } from './base.component'

/** Страница — внутренняя часть Pagination: корень — место в списке, внутри — Button. */
export function PaginationItem(props: PaginationItemProps): JSX.Element {
	const binding = setupPaginationItem(props)
	const state = binding.state
	const context = binding.context
	const root = createRootProps(() => ({
		state,
		sets: [state.attrs, state.dataset],
		forward: binding.forwardProps(),
	}))
	const content = resolveSlot(
		() => props.children,
		() => ({ text: state.text ?? '' }),
	)

	const activate = clickAction(() => {
		if (context) context.adapters.activation.active = true
	})

	return (
		<Show when={state.rendered}>
			<Root tag={state.tag} attributes={root} ref={binding.ref}>
				<Button
					embedded="pagination.page"
					type="button"
					disabled={state.disabled}
					size={state.size}
					variant={state.variant}
					{...state.aria}
					ref={activate}
				>
					{content() ?? state.text}
				</Button>
			</Root>
		</Show>
	)
}
