import type { ReactElement } from 'react'
import { Elevate, hasSlot, relaySlot, renderSlot, toRootProps } from '../../adapter'
import { AccordionItem } from './item'
import { useSetupAccordion } from './setup.component'
import type { AccordionProps } from './base.component'

/** Accordion — набор раскрывающихся секций; слоты секций — AGENTS.md (React), «Слоты». */
export function Accordion(props: AccordionProps): ReactElement | null {
	const { ref, forwardProps, state, layer } = useSetupAccordion(props)

	const { rendered, shown, attrs } = state

	if (!rendered) return null

	return (
		<div {...toRootProps(ref, state, [attrs], forwardProps)}>
			<Elevate layer={layer}>
				{hasSlot(props.children)
					? renderSlot(props.children)
					: shown?.map((item) => (
							<AccordionItem
								key={item.uid}
								ctrl={item}
								leading-icon={renderSlot(props['item-leading-icon'], { item })}
								leading={renderSlot(props['item-leading'], { item })}
								header={relaySlot(props.item, { item })}
								trailing={renderSlot(props['item-trailing'], { item })}
								trailing-icon={renderSlot(props['item-trailing-icon'], { item })}
							>
								{renderSlot(props['item-content'], { item })}
							</AccordionItem>
						))}
			</Elevate>
		</div>
	)
}
