import type { ElementType, ReactElement } from 'react'
import { renderSlot, toRootProps } from '../../adapter'
import { useSetupComponentView } from './setup.component'
import type { ComponentViewProps } from './base.component'

/** ComponentView — корень по `tag` со слотом `default`. */
export function ComponentView(props: ComponentViewProps): ReactElement | null {
	const { ref, forwardProps, state } = useSetupComponentView(props)

	const { rendered, tag, aria, dataset, attrs } = state

	if (!rendered) return null

	const Tag = tag as ElementType

	return (
		<Tag {...toRootProps(ref, state, [attrs, aria, dataset], forwardProps)}>
			{renderSlot(props.children)}
		</Tag>
	)
}
