import type { ElementType, ReactElement } from 'react'
import { renderSlot, toAriaProps } from '../../adapter'
import { useSetupButton } from './setup.component'
import type { ButtonProps } from './base.component'

/**
 * Button — рендерит кнопку с текстом из Core.
 *
 * - `tag` по умолчанию `button` (из TButton.defaultValues)
 * - disabled → `disabled` у нативного button, иначе `aria-disabled`
 *
 * Слоты объявлены в контракте (ButtonContribution) и одинаковы во всех
 * адаптерах: `leading`, `default` (здесь — `children`, со scope `{ text }`),
 * `trailing`.
 */
export function Button(props: ButtonProps): ReactElement | null {
	const { ref, forwardProps, state } = useSetupButton(props)

	const { rendered, visible, tag, classes, disabled, text, aria, dir } = state

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
			dir={(dir as 'ltr' | 'rtl' | null) ?? undefined}
			{...(isNativeButton ? { disabled: disabled as boolean } : {})}
			{...toAriaProps(aria)}
		>
			{renderSlot(props.leading)}
			<span className="s-button__text">
				{renderSlot(props.children, { text: text as string }) ?? text}
			</span>
			{renderSlot(props.trailing)}
		</Tag>
	)
}
