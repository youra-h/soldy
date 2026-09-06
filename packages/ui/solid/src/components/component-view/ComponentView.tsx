import { Show, children, createMemo, type JSX } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import { setupComponentView } from './setup.component'
import type { ComponentViewProps } from './base.component'

/**
 * ComponentView — рендерит динамический `tag` с классами из Core.
 *
 * - `rendered` — компонент не отрисован вовсе
 * - `visible` — отрисован, но скрыт через display: none
 */
export function ComponentView(props: ComponentViewProps): JSX.Element {
	const binding = setupComponentView(props)
	const state = binding.state

	// children() резолвит содержимое один раз: прямое чтение props.children
	// в нескольких местах создавало бы узлы заново.
	const resolved = children(() => props.children)

	const attrs = createMemo(() => {
		const rest = binding.forwardProps()

		return {
			...rest,
			class: [(state.classes as string[]).join(' '), rest.class].filter(Boolean).join(' '),
			style: { ...(rest.style as object), display: state.visible ? undefined : 'none' },
		}
	})

	return (
		<Show when={state.rendered}>
			<Dynamic component={state.tag as string} {...attrs()} ref={binding.ref}>
				{resolved()}
			</Dynamic>
		</Show>
	)
}
