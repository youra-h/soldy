import type { ReactElement } from 'react'
import { Elevate, hasSlot, renderSlot, toRootProps } from '../../adapter'
import { AccordionItem } from './item'
import { useSetupAccordion } from './setup.component'
import type { AccordionProps } from './base.component'

/**
 * Accordion — набор раскрывающихся секций; слоты секций — AGENTS.md (React),
 * «Слоты».
 *
 * The item slots go to each section as the owner's own props, not already
 * called: calling one here would build a new React element on every redraw
 * of the owner, defeating the section's render boundary regardless of it —
 * `memo` sees a new `children`/prop reference and redraws anyway. The
 * section calls them itself, with its own `ctrl` in their scope, the item
 * identity it already carries as a stable prop (AGENTS.md, Pitfalls).
 */
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
								leading-icon={props['item-leading-icon']}
								leading={props['item-leading']}
								header={props.item}
								trailing={props['item-trailing']}
								trailing-icon={props['item-trailing-icon']}
							>
								{props['item-content']}
							</AccordionItem>
						))}
			</Elevate>
		</div>
	)
}
