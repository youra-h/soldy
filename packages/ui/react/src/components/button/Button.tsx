import type { ElementType, ReactElement } from 'react'
import { toAriaProps } from '../../adapter'
import { useSetupButton } from './setup.component'
import type { ButtonProps } from './base.component'

/**
 * Button — рендерит кнопку с текстом из Core.
 *
 * - `tag` по умолчанию `button` (из TButton.defaultValues)
 * - `children` переопределяет `text`
 * - disabled → `disabled` у нативного button, иначе `aria-disabled`
 */
export function Button(props: ButtonProps): ReactElement | null {
	const { ref, forwardProps, state } = useSetupButton(props)

	const { rendered, visible, tag, classes, disabled, text, aria } = state

	if (!rendered) return null

	const Tag = tag as ElementType
	const isNativeButton = tag === 'button'

	const { className: userClassName, style: userStyle, ...restProps } = forwardProps
	const className = [classes.join(' '), userClassName].filter(Boolean).join(' ')
	const style = visible ? userStyle : { ...(userStyle ?? {}), display: 'none' }

	// restProps идёт ПЕРВЫМ: в React 19 `ref` — обычный проп, и переданный
	// потребителем ref, попав в restProps, перекрыл бы ref адаптера и тихо
	// сломал бы привязку к TElementPlugin (не было бы element:ready).
	return (
		<Tag
			{...restProps}
			ref={ref}
			className={className}
			style={style}
			{...(isNativeButton ? { disabled: disabled as boolean } : {})}
			{...toAriaProps(aria)}
		>
			<span className="s-button__text">{props.children ?? text}</span>
		</Tag>
	)
}
