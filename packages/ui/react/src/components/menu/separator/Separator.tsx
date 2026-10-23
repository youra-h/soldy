import type { ElementType, ReactElement } from 'react'
import { toRootProps } from '../../../adapter'
import { useSetupMenuSeparator } from './setup.component'
import type { MenuSeparatorProps } from './base.component'

/** MenuSeparator — линия между группами пунктов, `role="separator"` от ядра. */
export function MenuSeparator(props: MenuSeparatorProps): ReactElement | null {
	const { ref, forwardProps, state } = useSetupMenuSeparator(props)

	const { rendered, tag, attrs, aria, dataset } = state

	if (!rendered) return null

	const Tag = tag as ElementType

	return <Tag {...toRootProps(ref, state, [attrs, aria, dataset], forwardProps)} />
}
