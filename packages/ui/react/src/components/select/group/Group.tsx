import type { ElementType, ReactElement } from 'react'
import { Elevate, renderSlot, toAriaProps, toRootProps } from '../../../adapter'
import { useSetupSelectGroup } from './setup.component'
import type { SelectGroupProps } from './base.component'

/**
 * SelectGroup — опции списка панели под общей подписью.
 * docs/agents/patterns.md, «Граница переиспользования между похожими компонентами (критично)».
 */
export function SelectGroup(props: SelectGroupProps): ReactElement | null {
	const { ref, forwardProps, state, layer } = useSetupSelectGroup(props)

	const { rendered, tag, label, labelAria, attrs, aria, dataset } = state

	if (!rendered) return null

	const Tag = tag as ElementType

	return (
		<Tag {...toRootProps(ref, state, [attrs, aria, dataset], forwardProps)}>
			{label ? (
				<div className="so-select-group__label" {...toAriaProps(labelAria)}>
					{label}
				</div>
			) : null}
			<Elevate layer={layer}>{renderSlot(props.children)}</Elevate>
		</Tag>
	)
}
