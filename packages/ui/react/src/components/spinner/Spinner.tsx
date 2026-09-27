import type { ElementType, ReactElement } from 'react'
import { renderSlot, toRootProps } from '../../adapter'
import { useSetupSpinner } from './setup.component'
import type { SpinnerProps } from './base.component'

/**
 * Spinner — индикатор загрузки: корень по `tag` (по умолчанию `span`) и
 * содержимое в `children`.
 *
 * Корень — живая область `role="status"` (пишет ядро); имени по умолчанию нет,
 * его даёт `aria_label`. Толщина кольца приходит стилем от плагина раскладки —
 * пользовательским свойством `--spinner-border-width`.
 */
export function Spinner(props: SpinnerProps): ReactElement | null {
	const { ref, forwardProps, state } = useSetupSpinner(props)

	const { rendered, tag, aria, attrs } = state

	if (!rendered) return null

	const Tag = tag as ElementType

	// Наборы ядра, поверх — атрибуты снаружи, `ref` адаптера последним (`toRootProps`)
	return (
		<Tag {...toRootProps(ref, state, [attrs, aria], forwardProps)}>
			{renderSlot(props.children)}
		</Tag>
	)
}
