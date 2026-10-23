import type { ElementType, ReactElement } from 'react'
import { Elevate, renderSlot, toAriaProps, toRootProps } from '../../../adapter'
import { useSetupMenuRadioGroup } from './setup.component'
import type { MenuRadioGroupProps } from './base.component'

/** MenuRadioGroup — переключатели меню под общей подписью: роль `group`, не `radiogroup` (APG). */
export function MenuRadioGroup(props: MenuRadioGroupProps): ReactElement | null {
	const { ref, forwardProps, state, layer } = useSetupMenuRadioGroup(props)

	const { rendered, tag, label, labelAria, attrs, aria, dataset } = state

	if (!rendered) return null

	const Tag = tag as ElementType

	return (
		<Tag {...toRootProps(ref, state, [attrs, aria, dataset], forwardProps)}>
			{label ? (
				<div className="so-menu-group__label" {...toAriaProps(labelAria)}>
					{label}
				</div>
			) : null}
			<Elevate layer={layer}>{renderSlot(props.children)}</Elevate>
		</Tag>
	)
}
