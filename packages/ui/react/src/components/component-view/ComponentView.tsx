import type { ElementType, ReactElement } from 'react'
import { renderSlot, toRootProps } from '../../adapter'
import { useSetupComponentView } from './setup.component'
import type { ComponentViewProps } from './base.component'

/**
 * ComponentView — рендерит динамический `tag` с классами из Core.
 *
 * - `rendered` — v-if (null при false)
 * - `visible` — v-show (display: none при false), см. `toRootLayout`
 * - `attrs`/`aria`/`dataset` — три набора ядра раскладываются на корень, как
 *   у Button: сам по себе ComponentView не пишет в них ничего, но наследники
 *   (Icon, Skeleton, …) пишут, и без раскладки здесь запись до DOM не доходит.
 */
export function ComponentView(props: ComponentViewProps): ReactElement | null {
	const { ref, forwardProps, state } = useSetupComponentView(props)

	const { rendered, tag, aria, dataset, attrs } = state

	if (!rendered) return null

	const Tag = tag as ElementType

	// Наборы ядра, поверх — атрибуты снаружи, `ref` адаптера последним (`toRootProps`)
	return (
		<Tag {...toRootProps(ref, state, [attrs, aria, dataset], forwardProps)}>
			{renderSlot(props.children)}
		</Tag>
	)
}
