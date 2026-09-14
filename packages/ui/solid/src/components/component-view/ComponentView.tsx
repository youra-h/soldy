import { Show, children, type JSX } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import { renderSlot } from '../../adapter'
import { setupComponentView } from './setup.component'
import type { ComponentViewProps } from './base.component'

/**
 * ComponentView — рендерит динамический `tag` с классами из Core.
 *
 * - `rendered` — компонент не отрисован вовсе
 * - `visible` — отрисован, но скрыт через display: none
 * - `attrs`/`aria`/`dataset` — три набора ядра раскладываются на корень, как
 *   у Button: сам по себе ComponentView не пишет в них ничего, но наследники
 *   (Icon, Spinner, …) пишут, и без раскладки здесь запись до DOM не доходит.
 */
export function ComponentView(props: ComponentViewProps): JSX.Element {
	const binding = setupComponentView(props)
	const state = binding.state

	// children() резолвит содержимое один раз: прямое чтение props.children
	// в нескольких местах создавало бы узлы заново.
	const resolved = children(() => renderSlot(props.children))

	return (
		<Show when={state.rendered}>
			<Dynamic
				component={state.tag as string}
				{...binding.forwardProps()}
				class={[state.classes?.join(' '), binding.forwardProps().class]
					.filter(Boolean)
					.join(' ')}
				style={{
					...(binding.forwardProps().style as object),
					display: state.visible ? undefined : 'none',
				}}
				// attrs (в т.ч. dir по direction), aria и dataset — null в значении
				// Solid трактует как «атрибут не ставить».
				{...state.attrs}
				{...state.aria}
				{...state.dataset}
				ref={binding.ref}
			>
				{resolved()}
			</Dynamic>
		</Show>
	)
}
