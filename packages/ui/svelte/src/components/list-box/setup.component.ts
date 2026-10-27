import {
	ListBoxCollectionDescriptor,
	ListBoxDescriptor,
	TCollectionExtension,
	TDragAndDropCollectionExtension,
	TVirtualCollectionExtension,
} from '@soldy-ui/setup'
import {
	createSvelteAdapterContext,
	joinBindings,
	useAdapter,
	useCollectionAdapter,
	useElevator,
	type TRootReceiver,
} from '../../adapter'
import type { ListBoxProps } from './base.component'

export function setupListBox(
	getProps: () => ListBoxProps,
	mountId: string,
	receive: TRootReceiver,
) {
	const elevator = useElevator()
	const props = getProps()
	const adapter = createSvelteAdapterContext(ListBoxDescriptor(), {
		ctrl: props.ctrl,
		props,
		mountId,
	})

	const collectionAdapter = createSvelteAdapterContext(
		ListBoxCollectionDescriptor(),
		{
			props,
			mountId,
			options: { owner: adapter.instance, engine: props.engine },
		},
		{ bundle: adapter.bundle },
	)
		.use(TCollectionExtension, { elevator })
		.use(TDragAndDropCollectionExtension, { elevator })
		.use(TVirtualCollectionExtension, { elevator })

	const collectionBinding = useCollectionAdapter(collectionAdapter, getProps)
	const owner = useAdapter(adapter, getProps, receive)

	return joinBindings(owner, collectionBinding)
}
