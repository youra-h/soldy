import type { ElementType, ReactElement } from 'react'
import { renderSlot, toRootProps } from '../../adapter'
import { useSetupButton } from './setup.component'
import type { ButtonProps } from './base.component'

/**
 * Button — кнопка с текстом и слотами `leading`, `default`, `trailing`.
 * Порядок атрибутов корня — AGENTS.md (React), «Корень и `ref` потребителя».
 */
export function Button(props: ButtonProps): ReactElement | null {
	const { ref, forwardProps, state } = useSetupButton(props)

	const { rendered, tag, text, aria, dataset, attrs } = state

	if (!rendered) return null

	const Tag = tag as ElementType

	return (
		<Tag {...toRootProps(ref, state, [attrs, aria, dataset], forwardProps)}>
			{renderSlot(props.leading)}
			<span className="so-button__text">
				{renderSlot(props.children, { text: text ?? '' }) ?? text}
			</span>
			{renderSlot(props.trailing)}
		</Tag>
	)
}
