import { Show, type JSX } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import { createRootProps, rootTag } from '../../adapter'
import { setupIcon } from './setup.component'
import type { IconProps } from './base.component'

/**
 * Icon — корень по `tag`, без содержимого: картинку рисует сам тег.
 *
 * `tag` — имя элемента или компонент Solid (SVG-иконка приложения, иконка по
 * роли из пакета иконок — `roleIcon(role)` адаптера). Компонент получает
 * пропсами `ref`, `class`, `style` и атрибуты ARIA и обязан положить их на
 * свой корень: без `ref` не придёт `element:ready`, без класса и стиля —
 * размер, без ARIA иконка перестанет быть скрытой от скринридера.
 *
 * Размер (`width`, `height`) приходит стилем от плагина раскладки, имя — от
 * плагина доступного имени: без него иконка скрыта (`aria-hidden`), с ним
 * становится `role="img"`.
 */
export function Icon(props: IconProps): JSX.Element {
	const binding = setupIcon(props)
	const state = binding.state
	// Наборы ядра, поверх — атрибуты снаружи, `ref` адаптера последним
	const root = createRootProps(() => ({
		state,
		sets: [state.attrs, state.aria],
		forward: binding.forwardProps(),
	}))

	return (
		<Show when={state.rendered}>
			<Dynamic {...root()} component={rootTag(state.tag)} ref={binding.ref} />
		</Show>
	)
}
