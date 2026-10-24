import type { ElementType, ReactElement } from 'react'
import { renderSlot, toRootProps } from '../../adapter'
import { useSetupButton } from './setup.component'
import type { ButtonProps } from './base.component'

/**
 * Button — кнопка с текстом и слотами `leading`, `default`, `trailing`.
 * Порядок атрибутов корня — AGENTS.md (React), «Корень и `ref` потребителя».
 */
export function Button(props: ButtonProps): ReactElement | null {
	return renderButton(useSetupButton(props), props)
}

/** Что разметке кнопки нужно от её связки. */
export type TButtonBinding = Pick<
	ReturnType<typeof useSetupButton>,
	'ref' | 'forwardProps' | 'state'
>

/**
 * Разметка кнопки по её связке. Одна на Button и строку элемента коллекции
 * (`ItemRow`): у них разная сборка, а разметка та же.
 */
export function renderButton(
	{ ref, forwardProps, state }: TButtonBinding,
	props: ButtonProps,
): ReactElement | null {
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
