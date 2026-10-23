import {
	AccordionCollectionDescriptor,
	AccordionDescriptor,
	TCollectionExtension,
	TDragAndDropCollectionExtension,
} from '@soldy-ui/setup'
import {
	createSolidAdapterContext,
	useAdapter,
	useCollectionAdapter,
	useElevator,
} from '../../adapter'
import type { AccordionProps } from './base.component'

export function setupAccordion(props: AccordionProps) {
	const { elevator, layer } = useElevator()
	const adapter = createSolidAdapterContext(AccordionDescriptor(), { ctrl: props.ctrl, props })
	const owner = useAdapter(adapter, props)

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

	return { ...useCollectionAdapter(collectionAdapter, props, owner), layer }
}
