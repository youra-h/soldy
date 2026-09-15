import { Show, children, type JSX } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import { renderSlot } from '../../adapter'
import { setupButton } from './setup.component'
import type { ButtonProps } from './base.component'

/**
 * Button — рендерит кнопку с текстом из Core.
 *
 * - `tag` по умолчанию `button` (из TButton.defaultValues)
 * - `children` переопределяет `text`
 * - disabled → нативный атрибут `disabled` там, где тег его поддерживает
 *   (`attrs`), иначе `aria-disabled` (`aria`) — оба набора считает ядро
 */
export function Button(props: ButtonProps): JSX.Element {
	const binding = setupButton(props)
	const state = binding.state

	// Слоты контракта: leading, default (scope { text }), trailing
	const leading = children(() => renderSlot(props.leading))
	const resolved = children(() => renderSlot(props.children, { text: state.text ?? '' }))
	const trailing = children(() => renderSlot(props.trailing))

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
				// attrs — нативный disabled там, где у тега он есть, и dir по
				// direction; aria вычисляет ядро: role, tabindex, aria-disabled на
				// остальных тегах; dataset — data-disabled для темы, на любом теге.
				// null в значении Solid понимает как «атрибут не ставить».
				{...state.attrs}
				{...state.aria}
				{...state.dataset}
				ref={binding.ref}
			>
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
