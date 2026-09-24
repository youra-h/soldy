import type { ElementType, ReactElement } from 'react'
import { renderSlot, toAriaProps, toRootLayout } from '../../adapter'
import { useSetupButton } from './setup.component'
import type { ButtonProps } from './base.component'

/**
 * Button — рендерит кнопку с текстом из Core.
 *
 * - `tag` по умолчанию `button` (из TButton.defaultValues)
 * - disabled → нативный атрибут `disabled` там, где тег его поддерживает
 *   (`attrs`), иначе `aria-disabled` (`aria`) — оба набора считает ядро;
 *   `data-disabled` для темы (`dataset`) стоит на любом теге
 *
 * Слоты объявлены в контракте (ButtonDescriptor) и одинаковы во всех
 * адаптерах: `leading`, `default` (здесь — `children`, со scope `{ text }`),
 * `trailing`.
 */
export function Button(props: ButtonProps): ReactElement | null {
	const { ref, forwardProps, state } = useSetupButton(props)

	const { rendered, tag, text, aria, dataset, attrs } = state

	if (!rendered) return null

	const Tag = tag as ElementType

	// forwardProps идёт ПЕРВЫМ: в React 19 `ref` — обычный проп, и переданный
	// потребителем ref перекрыл бы ref адаптера и тихо сломал бы привязку к
	// TElementPlugin (не было бы element:ready). Класс и стиль потребителя
	// раскладка корня сливает с классами и стилем ядра.
	return (
		<Tag
			{...forwardProps}
			ref={ref}
			{...toRootLayout(state, forwardProps)}
			{...toAriaProps(attrs)}
			{...toAriaProps(aria)}
			{...toAriaProps(dataset)}
		>
			{renderSlot(props.leading)}
			<span className="s-button__text">
				{renderSlot(props.children, { text: text ?? '' }) ?? text}
			</span>
			{renderSlot(props.trailing)}
		</Tag>
	)
}
