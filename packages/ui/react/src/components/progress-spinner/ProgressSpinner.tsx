import type { ElementType, ReactElement } from 'react'
import { toRootProps } from '../../adapter'
import { useSetupProgressSpinner } from './setup.component'
import type { ProgressSpinnerProps } from './base.component'

/**
 * ProgressSpinner — индикатор выполнения кольцом, корень по умолчанию `span`.
 * Модель и рисунок — docs/agents/patterns.md, «Готовые паттерны».
 */
export function ProgressSpinner(props: ProgressSpinnerProps): ReactElement | null {
	const { ref, forwardProps, state } = useSetupProgressSpinner(props)

	const { rendered, tag, aria, dataset, attrs, fractionStyle } = state

	if (!rendered) return null

	const Tag = tag as ElementType

	return (
		<Tag {...toRootProps(ref, state, [attrs, aria, dataset], forwardProps, fractionStyle)}>
			{/* Радиус 7 в поле 16 × 16: при толщине темы 2 кольцо ровно касается краёв */}
			<svg className="so-progress-spinner__ring" viewBox="0 0 16 16" aria-hidden="true">
				<circle className="so-progress-spinner__track" cx="8" cy="8" r="7" />
				<circle className="so-progress-spinner__range" cx="8" cy="8" r="7" pathLength="1" />
				<circle
					className="so-progress-spinner__runner"
					cx="8"
					cy="8"
					r="7"
					pathLength="1"
				/>
			</svg>
		</Tag>
	)
}
