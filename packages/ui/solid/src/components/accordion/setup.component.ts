import {
	AccordionCollectionDescriptor,
	AccordionDescriptor,
	TCollectionExtension,
	TDragAndDropCollectionExtension,
} from '@soldy-ui/setup'
import {
	createSolidAdapterContext,
	useAdapter,
	joinBindings,
	useCollectionAdapter,
	useElevator,
} from '../../adapter'
import type { AccordionProps } from './base.component'

export function setupAccordion(props: AccordionProps) {
	const { elevator, layer } = useElevator()
	const adapter = createSolidAdapterContext(AccordionDescriptor(), { ctrl: props.ctrl, props })

	const collectionAdapter = createSolidAdapterContext(
		AccordionCollectionDescriptor(),
		{
			props,
			options: { owner: adapter.instance, engine: props.engine },
		},
		{ bundle: adapter.bundle },
	)
		.use(TCollectionExtension, { elevator })
		.use(TDragAndDropCollectionExtension, { elevator })

	const collectionBinding = useCollectionAdapter(collectionAdapter, props)
	const owner = useAdapter(adapter, props)

	return { ...joinBindings(owner, collectionBinding), layer }
}
