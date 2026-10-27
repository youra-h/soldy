import { TCollectionExtension, TagsCollectionDescriptor, TagsDescriptor } from '@soldy-ui/setup'
import {
	createSolidAdapterContext,
	useOwnerAdapter,
	joinBindings,
	useCollectionAdapter,
	useElevator,
} from '../../adapter'
import type { TagsProps } from './base.component'

export function setupTags(props: TagsProps) {
	const { elevator, layer } = useElevator()
	const adapter = createSolidAdapterContext(TagsDescriptor(), { ctrl: props.ctrl, props })
	const owner = useOwnerAdapter(adapter, props)

	const collectionAdapter = createSolidAdapterContext(
		TagsCollectionDescriptor(),
		{
			props,
			options: { owner: adapter.instance, engine: props.engine },
		},
		{ bundle: adapter.bundle },
	).use(TCollectionExtension, { elevator })

	const collectionBinding = useCollectionAdapter(collectionAdapter, props, owner.forwardProps)

	return { ...joinBindings(owner, collectionBinding), layer }
}
