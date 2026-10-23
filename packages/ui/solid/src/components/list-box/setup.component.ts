import {
	ListBoxCollectionDescriptor,
	ListBoxDescriptor,
	TCollectionExtension,
	TDragAndDropCollectionExtension,
	TVirtualCollectionExtension,
} from '@soldy-ui/setup'
import {
	createSolidAdapterContext,
	useAdapter,
	joinBindings,
	useCollectionAdapter,
	useElevator,
} from '../../adapter'
import type { ListBoxProps } from './base.component'

export function setupListBox(props: ListBoxProps) {
	const { elevator, layer } = useElevator()
	const adapter = createSolidAdapterContext(ListBoxDescriptor(), { ctrl: props.ctrl, props })
	const owner = useAdapter(adapter, props)

	const collectionAdapter = createSolidAdapterContext(
		ListBoxCollectionDescriptor(),
		{
			props,
			options: { owner: adapter.instance, engine: props.engine },
		},
		{ bundle: adapter.bundle },
	)
		.use(TCollectionExtension, { elevator })
		.use(TDragAndDropCollectionExtension, { elevator })
		.use(TVirtualCollectionExtension, { elevator })

	const collectionBinding = useCollectionAdapter(collectionAdapter, props, owner.forwardProps)

	return { ...joinBindings(owner, collectionBinding), layer }
}
