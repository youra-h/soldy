import type { ElementType, ReactElement } from 'react'
import { renderSlot, toRootProps } from '../../adapter'
import { useSetupLabel } from './setup.component'
import type { LabelProps } from './base.component'

/**
 * Label — подпись контрола: контрол вложен, внутри только `span`. docs/agents/a11y.md,
 * «Видимое имя контрола — подпись `Label`, вложением».
 */
export function Label(props: LabelProps): ReactElement | null {
	const { ref, forwardProps, state } = useSetupLabel(props)

	const { rendered, tag, text, aria, dataset, attrs } = state

	if (!rendered) return null

	const Tag = tag as ElementType

	return (
		<Tag {...toRootProps(ref, state, [attrs, aria, dataset], forwardProps)}>
			<span className="so-label__control">{renderSlot(props.children)}</span>
			<span className="so-label__text">{renderSlot(props.content) ?? text}</span>
		</Tag>
	)
}
