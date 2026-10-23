import type { ElementType, ReactElement } from 'react'
import { toRootProps } from '../../adapter'
import { useSetupProgressLinear } from './setup.component'
import type { ProgressLinearProps } from './base.component'

/**
 * ProgressLinear — индикатор выполнения линией: корень — дорожка, в нём заливка.
 * Всё `span`: полосу кладут в `Button` и `Label`, где разрешена только строчная разметка.
 */
export function ProgressLinear(props: ProgressLinearProps): ReactElement | null {
	const { ref, forwardProps, state } = useSetupProgressLinear(props)

	const { rendered, tag, aria, dataset, attrs, percentStyle } = state

	if (!rendered) return null

	const Tag = tag as ElementType

	return (
		<Tag {...toRootProps(ref, state, [attrs, aria, dataset], forwardProps, percentStyle)}>
			<span className="so-progress-linear__range" />
		</Tag>
	)
}
