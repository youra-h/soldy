import type { JSX } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import { createRootProps, renderSlot, rootTag } from '../../adapter'
import { Show } from '../../adapter/runtime/flow'
import { setupSkeleton } from './setup.component'
import type { SkeletonProps } from './base.component'

/**
 * Заглушка поверх будущего содержимого. Корень есть всегда: `rendered` и `visible`
 * решают только, показана ли заглушка (`present`), — в раскладку корня их нет.
 */
export function Skeleton(props: SkeletonProps): JSX.Element {
	const binding = setupSkeleton(props)
	const state = binding.state
	const root = createRootProps(() => ({
		state: { classes: state.classes, layout_styles: state.layout_styles },
		sets: [state.attrs, state.aria],
		forward: binding.forwardProps(),
	}))

	return (
		<Dynamic {...root()} component={rootTag(state.tag)} ref={binding.ref}>
			<Show when={state.present}>
				<div class="so-skeleton__placeholder" aria-hidden="true" />
			</Show>
			{renderSlot(props.children)}
		</Dynamic>
	)
}
