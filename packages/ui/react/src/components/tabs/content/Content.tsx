import type { ElementType, ReactElement } from 'react'
import { renderSlot, toRootProps } from '../../../adapter'
import { useSetupTabsContent } from './setup.component'
import type { TabsContentProps } from './base.component'

/** TabsContent — панель таба: рисуется, пока активен таб того же `value`. */
export function TabsContent(props: TabsContentProps): ReactElement | null {
	const { ref, forwardProps, state } = useSetupTabsContent(props)

	const { rendered, active, tag, attrs, aria } = state

	if (!rendered || !active) return null

	const Tag = tag as ElementType

	return (
		<Tag {...toRootProps(ref, state, [attrs, aria], forwardProps)}>
			{renderSlot(props.children)}
		</Tag>
	)
}
