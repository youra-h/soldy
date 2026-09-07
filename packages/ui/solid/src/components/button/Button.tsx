import { Show, children, createMemo, type JSX } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import { setupButton } from './setup.component'
import type { ButtonProps } from './base.component'

/**
 * Button — рендерит кнопку с текстом из Core.
 *
 * - `tag` по умолчанию `button` (из TButton.defaultValues)
 * - `children` переопределяет `text`
 * - disabled → атрибут disabled у нативного button, иначе aria-disabled
 */
export function Button(props: ButtonProps): JSX.Element {
	const binding = setupButton(props)
	const state = binding.state

	const resolved = children(() => props.children)

	const attrs = createMemo(() => {
		const rest = binding.forwardProps()
		const isNativeButton = state.tag === 'button'

		return {
			...rest,
			class: [(state.classes as string[]).join(' '), rest.class].filter(Boolean).join(' '),
			style: { ...(rest.style as object), display: state.visible ? undefined : 'none' },
			...(isNativeButton ? { disabled: state.disabled } : {}),
			// aria вычисляет ядро: role, tabindex, aria-disabled.
			// null в значении Solid понимает как «атрибут не ставить».
			...(state.aria as Record<string, string | null>),
		}
	})

	return (
		<Show when={state.rendered}>
			<Dynamic component={state.tag as string} {...attrs()} ref={binding.ref}>
				<span class="s-button__text">
					<Show when={resolved()} fallback={state.text}>
						{resolved()}
					</Show>
				</span>
			</Dynamic>
		</Show>
	)
}
