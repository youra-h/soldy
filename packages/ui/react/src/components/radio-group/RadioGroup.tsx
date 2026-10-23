import type { ElementType, ReactElement } from 'react'
import { Elevate, hasSlot, relaySlot, renderSlot, toRootProps } from '../../adapter'
import { RadioGroupItem } from './item'
import { useSetupRadioGroup } from './setup.component'
import type { RadioGroupProps } from './base.component'

/** RadioGroup — группа радио, «один из N»: docs/agents/patterns.md, «Готовые паттерны». */
export function RadioGroup(props: RadioGroupProps): ReactElement | null {
	const { ref, forwardProps, state, layer } = useSetupRadioGroup(props)

	const { rendered, tag, shown, attrs, aria, dataset } = state

	if (!rendered) return null

	const Tag = tag as ElementType

	return (
		<Tag {...toRootProps(ref, state, [attrs, aria, dataset], forwardProps)}>
			<Elevate layer={layer}>
				{hasSlot(props.children)
					? renderSlot(props.children)
					: shown?.map((item) => (
							<RadioGroupItem key={item.uid} ctrl={item}>
								{relaySlot(props.item, { item })}
							</RadioGroupItem>
						))}
			</Elevate>
		</Tag>
	)
}
