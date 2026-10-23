import type { ElementType, ReactElement } from 'react'
import { toRootProps } from '../../adapter'
import { useSetupIcon } from './setup.component'
import type { IconProps } from './base.component'

/**
 * Icon — корень по `tag` без содержимого: картинку рисует сам тег. Компонент
 * React в `tag` обязан положить на свой корень `ref`, `className`, `style` и ARIA.
 */
export function Icon(props: IconProps): ReactElement | null {
	const { ref, forwardProps, state } = useSetupIcon(props)

	const { rendered, tag, aria, attrs } = state

	if (!rendered) return null

	const Tag = tag as ElementType

	return <Tag {...toRootProps(ref, state, [attrs, aria], forwardProps)} />
}
