import type { ElementType, ReactElement } from 'react'
import { renderSlot, toAriaProps } from '../../adapter'
import { useSetupComponentView } from './setup.component'
import type { ComponentViewProps } from './base.component'

/**
 * ComponentView — рендерит динамический `tag` с классами из Core.
 *
 * - `rendered` — v-if (null при false)
 * - `visible` — v-show (display: none при false)
 * - `attrs`/`aria`/`dataset` — три набора ядра раскладываются на корень, как
 *   у Button: сам по себе ComponentView не пишет в них ничего, но наследники
 *   (Icon, Spinner, …) пишут, и без раскладки здесь запись до DOM не доходит.
 */
export function ComponentView(props: ComponentViewProps): ReactElement | null {
	const { ref, forwardProps, state } = useSetupComponentView(props)

	const { rendered, visible, tag, classes, aria, dataset, attrs } = state

	if (!rendered) return null

	const Tag = tag as ElementType

	const { className: userClassName, style: userStyle, ...restProps } = forwardProps
	const className = [classes?.join(' '), userClassName].filter(Boolean).join(' ')
	const style = visible ? userStyle : { ...userStyle, display: 'none' }

	// restProps идёт ПЕРВЫМ: в React 19 `ref` — обычный проп, и переданный
	// потребителем ref, попав в restProps, перекрыл бы ref адаптера и тихо
	// сломал бы привязку к TElementPlugin (не было бы element:ready).
	return (
		<Tag
			{...restProps}
			ref={ref}
			className={className}
			style={style}
			{...toAriaProps(attrs)}
			{...toAriaProps(aria)}
			{...toAriaProps(dataset)}
		>
			{renderSlot(props.children)}
		</Tag>
	)
}
