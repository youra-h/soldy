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

	const item = createSolidAdapterContext(
		AccordionCollectionItemDescriptor(),
		{ props },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, { item: adapter.instance, member: adapter, elevator })

	const itemBinding = useCollectionAdapter(item, props)
	const owner = useAdapter(adapter, props)

	return { ...joinBindings(owner, itemBinding), context: item.instance.context }
}
