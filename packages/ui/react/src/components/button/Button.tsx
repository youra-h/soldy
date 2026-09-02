import type { ElementType, ReactElement } from 'react'
import { useButton, type ButtonProps } from './index'

/**
 * Button — рендерит кнопку с текстом из Core.
 *
 * - `tag` по умолчанию `button` (из TButton.defaultValues)
 * - `children` переопределяет `text`
 * - disabled → `disabled` у нативного button, иначе `aria-disabled`
 */
export function Button(props: ButtonProps): ReactElement | null {
	const { ref, forwardProps, state } = useButton(props)

	const { rendered, visible, tag, classes, disabled, text } = state

	if (!rendered) return null

	const Tag = tag as ElementType
	const isNativeButton = tag === 'button'

	const { className: userClassName, style: userStyle, ...restProps } = forwardProps
	const className = [classes.join(' '), userClassName].filter(Boolean).join(' ')
	const style = visible ? userStyle : { ...(userStyle ?? {}), display: 'none' }

	return (
		<Tag
			ref={ref}
			className={className}
			style={style}
			{...(isNativeButton
				? { disabled: disabled as boolean }
				: { 'aria-disabled': disabled as boolean })}
			{...restProps}
		>
			<span className="s-button__text">{props.children ?? text}</span>
		</Tag>
	)
}
