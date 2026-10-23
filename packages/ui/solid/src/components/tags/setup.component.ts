import { TCollectionExtension, TagsCollectionDescriptor, TagsDescriptor } from '@soldy-ui/setup'
import {
	createSolidAdapterContext,
	useAdapter,
	useCollectionAdapter,
	useElevator,
} from '../../adapter'
import type { TagsProps } from './base.component'

export function setupTags(props: TagsProps) {
	const { elevator, layer } = useElevator()
	const adapter = createSolidAdapterContext(TagsDescriptor(), { ctrl: props.ctrl, props })
	const owner = useAdapter(adapter, props)

	const collectionAdapter = createSolidAdapterContext(
		TagsCollectionDescriptor(),
		{
			props,
			options: { owner: adapter.instance, engine: props.engine },
		},
		{ bundle: adapter.bundle },
	).use(TCollectionExtension, { elevator })

	return { ...useCollectionAdapter(collectionAdapter, props, owner), layer }
}
