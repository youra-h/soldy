import {
	TCollectionExtension,
	TDragAndDropCollectionExtension,
	TabsCollectionDescriptor,
	TabsDescriptor,
} from '@soldy-ui/setup'
import {
	createSolidAdapterContext,
	useOwnerAdapter,
	joinBindings,
	useCollectionAdapter,
	useElevator,
} from '../../adapter'
import type { TabsProps } from './base.component'

export function setupTabs(props: TabsProps) {
	const { elevator, layer } = useElevator()
	const adapter = createSolidAdapterContext(TabsDescriptor(), { ctrl: props.ctrl, props })
	const owner = useOwnerAdapter(adapter, props)

	const collectionAdapter = createSolidAdapterContext(
		TabsCollectionDescriptor(),
		{
			props,
			options: { owner: adapter.instance, engine: props.engine },
		},
		{ bundle: adapter.bundle },
	)
		.use(TCollectionExtension, { elevator })
		.use(TDragAndDropCollectionExtension, { elevator })

	const collectionBinding = useCollectionAdapter(collectionAdapter, props, owner.forwardProps)

	return { ...joinBindings(owner, collectionBinding), layer }
}
