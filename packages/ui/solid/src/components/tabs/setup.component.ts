import {
	TCollectionExtension,
	TDragAndDropCollectionExtension,
	TabsCollectionDescriptor,
	TabsDescriptor,
} from '@soldy-ui/setup'
import {
	createSolidAdapterContext,
	useAdapter,
	useCollectionAdapter,
	useElevator,
} from '../../adapter'
import type { TabsProps } from './base.component'

export function setupTabs(props: TabsProps) {
	const { elevator, layer } = useElevator()
	const adapter = createSolidAdapterContext(TabsDescriptor(), { ctrl: props.ctrl, props })
	const owner = useAdapter(adapter, props)

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

	return { ...useCollectionAdapter(collectionAdapter, props, owner), layer }
}
