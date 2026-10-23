import {
	AccordionCollectionItemDescriptor,
	AccordionItemDescriptor,
	TCollectionItemExtension,
} from '@soldy-ui/setup'
import {
	createSolidAdapterContext,
	useAdapter,
	joinBindings,
	useCollectionAdapter,
	useElevator,
} from '../../../adapter'
import type { AccordionItemProps } from './base.component'

export function setupAccordionItem(props: AccordionItemProps) {
	const { elevator } = useElevator()
	const adapter = createSolidAdapterContext(AccordionItemDescriptor(), {
		ctrl: props.ctrl,
		props,
	})
	const owner = useAdapter(adapter, props)

	const item = createSolidAdapterContext(
		AccordionCollectionItemDescriptor(),
		{ props },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, { item: adapter.instance, elevator })

	const itemBinding = useCollectionAdapter(item, props, owner.forwardProps)

	return { ...joinBindings(owner, itemBinding), context: item.instance.context }
}
