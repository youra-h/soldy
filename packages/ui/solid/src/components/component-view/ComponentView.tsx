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
				// dir вычисляет ядро: null для 'inherit' — Solid трактует как «атрибут не ставить»
				dir={state.dir ?? undefined}
				ref={binding.ref}
			>
				{resolved()}
			</Dynamic>
		</Show>
	)
}
