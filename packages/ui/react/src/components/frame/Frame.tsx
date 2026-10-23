import type { ElementType, ReactElement } from 'react'
import { Teleport, renderSlot, toRootProps } from '../../adapter'
import { useSetupFrame } from './setup.component'
import type { FrameProps } from './base.component'

/**
 * Frame — слой поверх страницы: корень уходит телепортом в `target`, и все
 * атрибуты ложатся на него (AGENTS.md (React), «Teleport»).
 */
export function Frame(props: FrameProps): ReactElement | null {
	const { ref, forwardProps, state } = useSetupFrame(props)

	const { rendered, tag, target, contained, aria, dataset, attrs } = state

	if (!rendered) return null

	const Tag = tag as ElementType

	return (
		<Teleport to={target} disabled={contained}>
			<Tag {...toRootProps(ref, state, [attrs, aria, dataset], forwardProps)}>
				{renderSlot(props.children)}
			</Tag>
		</Teleport>
	)
}
