import type { JSX } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import { createRootProps, resolveSlot, rootTag } from '../../../adapter'
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

	function activate(): void {
		if (context) context.adapters.activation.active = true
	}

	return (
		<Show when={state.rendered}>
			<Dynamic {...root()} component={rootTag(state.tag)} ref={binding.ref}>
				<Button
					embedded="pagination.page"
					type="button"
					disabled={state.disabled}
					size={state.size}
					variant={state.variant}
					{...state.aria}
					onClick={activate}
				>
					{content() ?? state.text}
				</Button>
			</Dynamic>
		</Show>
	)
}
