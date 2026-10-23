import type { ElementType, ReactElement } from 'react'
import { Elevate, renderSlot, toAriaProps, toRootProps } from '../../../adapter'
import { useSetupListBoxGroup } from './setup.component'
import type { ListBoxGroupProps } from './base.component'

/**
 * ListBoxGroup — элементы списка под общей подписью.
 * docs/agents/patterns.md, «Граница переиспользования между похожими компонентами (критично)».
 */
export function ListBoxGroup(props: ListBoxGroupProps): ReactElement | null {
	const { ref, forwardProps, state, layer } = useSetupListBoxGroup(props)

	const { rendered, tag, label, labelAria, attrs, aria, dataset } = state

	if (!rendered) return null

	const Tag = tag as ElementType

	return (
		<Tag {...toRootProps(ref, state, [attrs, aria, dataset], forwardProps)}>
			{label ? (
				<div className="so-list-box-group__label" {...toAriaProps(labelAria)}>
					{label}
				</div>
			) : null}
			<Elevate layer={layer}>{renderSlot(props.children)}</Elevate>
		</Tag>
	)
}
