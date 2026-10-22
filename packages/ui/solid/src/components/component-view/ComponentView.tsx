import type { JSX } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import { createRootProps, renderSlot, rootTag } from '../../adapter'
import { Show } from '../../adapter/runtime/flow'
import { setupComponentView } from './setup.component'
import type { ComponentViewProps } from './base.component'

/**
 * ComponentView — рендерит динамический `tag` с классами из Core.
 *
 * - `rendered` — `<Show>`: при false корня нет
 * - `visible` — `display: none` поверх стиля корня, как `v-show` (`createRootProps`)
 * - `attrs`/`aria`/`dataset` — три набора ядра раскладываются на корень, как
 *   у Button: сам по себе ComponentView не пишет в них ничего, но наследники
 *   (Icon, Skeleton, …) пишут, и без раскладки здесь запись до DOM не доходит.
 */
export function ComponentView(props: ComponentViewProps): JSX.Element {
	const binding = setupComponentView(props)
	const state = binding.state
	// Наборы ядра, поверх — атрибуты снаружи, `ref` адаптера последним
	const root = createRootProps(() => ({
		state,
		sets: [state.attrs, state.aria, state.dataset],
		forward: binding.forwardProps(),
	}))

	return (
		<Show when={state.rendered}>
			<Dynamic {...root()} component={rootTag(state.tag)} ref={binding.ref}>
				{renderSlot(props.children)}
			</Dynamic>
		</Show>
	)
}
