import type { ElementType, ReactElement } from 'react'
import { toAriaProps, toRootLayout } from '../../adapter'
import { useSetupIcon } from './setup.component'
import type { IconProps } from './base.component'

/**
 * Icon — корень по `tag`, без содержимого: картинку рисует сам тег.
 *
 * `tag` — имя элемента или компонент React (SVG-иконка). Компонент получает
 * пропсами `ref`, `className`, `style` и атрибуты ARIA и обязан положить их на
 * свой корень: без `ref` не придёт `element:ready`, без класса и стиля —
 * размер, без ARIA иконка перестанет быть скрытой от скринридера.
 *
 * Размер (`width`, `height`) приходит стилем от плагина раскладки, имя —
 * от плагина доступного имени: без него иконка скрыта (`aria-hidden`), с ним
 * становится `role="img"`. Иконку по роли из пакета иконок здесь не ищут: тег
 * для неё даёт `roleIcon(role)` адаптера.
 */
export function Icon(props: IconProps): ReactElement | null {
	const { ref, forwardProps, state } = useSetupIcon(props)

	const { rendered, tag, aria, attrs } = state

	if (!rendered) return null

	const Tag = tag as ElementType

	// forwardProps идёт ПЕРВЫМ, чтобы не перекрыть ref адаптера (см. Button)
	return (
		<Tag
			{...forwardProps}
			ref={ref}
			{...toRootLayout(state, forwardProps)}
			{...toAriaProps(attrs)}
			{...toAriaProps(aria)}
		/>
	)
}
