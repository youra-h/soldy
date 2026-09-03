import type { ElementType, ReactElement } from 'react'
import { useSetupComponentView } from './setup.component'
import type { ComponentViewProps } from './base.component'

/**
 * ComponentView — рендерит динамический `tag` с классами из Core.
 *
 * - `rendered` — v-if (null при false)
 * - `visible` — v-show (display: none при false)
 */
export function ComponentView(props: ComponentViewProps): ReactElement | null {
	const { ref, forwardProps, state } = useSetupComponentView(props)

	const { rendered, visible, tag, classes } = state

	if (!rendered) return null

	const Tag = tag as ElementType

	const { className: userClassName, style: userStyle, ...restProps } = forwardProps
	const className = [classes.join(' '), userClassName].filter(Boolean).join(' ')
	const style = visible ? userStyle : { ...(userStyle ?? {}), display: 'none' }

	return (
		<Tag ref={ref} className={className} style={style} {...restProps}>
			{props.children}
		</Tag>
	)
}
