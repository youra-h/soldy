import { Show, children, createMemo, type JSX } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import { renderSlot } from '../../adapter'
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

	// Слоты контракта: leading, default (scope { text }), trailing
	const leading = children(() => renderSlot(props.leading))
	const resolved = children(() => renderSlot(props.children, { text: state.text as string }))
	const trailing = children(() => renderSlot(props.trailing))

	const attrs = createMemo(() => {
		const rest = binding.forwardProps()
		const isNativeButton = state.tag === 'button'

		return {
			...rest,
			class: [(state.classes as string[]).join(' '), rest.class].filter(Boolean).join(' '),
			style: { ...(rest.style as object), display: state.visible ? undefined : 'none' },
			dir: (state.dir as 'ltr' | 'rtl' | null) ?? undefined,
			...(isNativeButton ? { disabled: state.disabled } : {}),
			// aria вычисляет ядро: role, tabindex, aria-disabled.
			// null в значении Solid понимает как «атрибут не ставить».
			...(state.aria as Record<string, string | null>),
		}
	})

	return (
		<Show when={state.rendered}>
			<Dynamic component={state.tag as string} {...attrs()} ref={binding.ref}>
				{leading()}
				<span class="s-button__text">
					<Show when={resolved()} fallback={state.text}>
						{resolved()}
					</Show>
				</span>
				{trailing()}
			</Dynamic>
		</Show>
	)
}
