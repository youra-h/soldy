import type { JSX } from 'solid-js'
import { Elevate, ResolvedSlot, createRootProps, relaySlot, renderSlot } from '../../adapter'
import { For, Show } from '../../adapter/runtime/flow'
import { AccordionItem } from './item'
import { setupAccordion } from './setup.component'
import type { AccordionProps } from './base.component'

/** Набор раскрывающихся секций: секции — содержимое или `shown`. */
export function Accordion(props: AccordionProps): JSX.Element {
	const binding = setupAccordion(props)
	const state = binding.state
	const root = createRootProps(() => ({
		state,
		sets: [state.attrs],
		forward: binding.forwardProps(),
	}))

	return (
		<Show when={state.rendered}>
			<div {...root()} ref={binding.ref}>
				<Elevate layer={binding.layer}>
					<ResolvedSlot
						content={props.children}
						fallback={
							<For each={state.shown}>
								{(item) => (
									<AccordionItem
										ctrl={item}
										leading-icon={renderSlot(props['item-leading-icon'], {
											item,
										})}
										leading={renderSlot(props['item-leading'], { item })}
										header={relaySlot(props.item, { item })}
										trailing={renderSlot(props['item-trailing'], { item })}
										trailing-icon={renderSlot(props['item-trailing-icon'], {
											item,
										})}
									>
										{renderSlot(props['item-content'], { item })}
									</AccordionItem>
								)}
							</For>
						}
					/>
				</Elevate>
			</div>
		</Show>
	)
}
