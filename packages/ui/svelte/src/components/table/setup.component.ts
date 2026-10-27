import {
	TCollectionExtension,
	TVirtualCollectionExtension,
	TableCollectionDescriptor,
	TableDescriptor,
} from '@soldy-ui/setup'
import {
	createSvelteAdapterContext,
	joinBindings,
	useAdapter,
	useCollectionAdapter,
	useElevator,
	type TRootReceiver,
} from '../../adapter'
import type { TableProps } from './base.component'

export function setupTable(getProps: () => TableProps, mountId: string, receive: TRootReceiver) {
	const elevator = useElevator()
	const props = getProps()
	const adapter = createSvelteAdapterContext(TableDescriptor(), {
		ctrl: props.ctrl,
		props,
		mountId,
	})

	const collectionAdapter = createSvelteAdapterContext(
		TableCollectionDescriptor(),
		{
			props,
			mountId,
			options: { owner: adapter.instance, engine: props.engine },
		},
		{ bundle: adapter.bundle },
	)
		.use(TCollectionExtension, { elevator })
		.use(TVirtualCollectionExtension, { elevator })

	const collectionBinding = useCollectionAdapter(collectionAdapter, getProps)
	const owner = useAdapter(adapter, getProps, receive)

	return Object.assign(joinBindings(owner, collectionBinding), {
		facade: collectionAdapter.instance,
	})
}
