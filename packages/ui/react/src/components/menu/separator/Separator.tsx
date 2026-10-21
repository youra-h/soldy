import type { ElementType, ReactElement } from 'react'
import { toRootProps } from '../../../adapter'
import { useSetupMenuSeparator } from './setup.component'
import type { MenuSeparatorProps } from './base.component'

/**
 * MenuSeparator — линия между группами пунктов, как `Menu.Separator` у Vue:
 * корень по `tag` с тремя наборами ядра — `role="separator"` от ядра. Внутри
 * ничего не рисуется, и слоя лифта у разделителя нет.
 */
export function MenuSeparator(props: MenuSeparatorProps): ReactElement | null {
	const { ref, forwardProps, state } = useSetupMenuSeparator(props)

	const { rendered, tag, attrs, aria, dataset } = state

	if (!rendered) return null

	const Tag = tag as ElementType

	// Наборы ядра, поверх — атрибуты снаружи, `ref` адаптера последним
	return <Tag {...toRootProps(ref, state, [attrs, aria, dataset], forwardProps)} />
}
