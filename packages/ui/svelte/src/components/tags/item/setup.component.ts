import {
	TCollectionItemExtension,
	TagsCollectionItemDescriptor,
	TagsItemDescriptor,
} from '@soldy-ui/setup'
import {
	createSvelteAdapterContext,
	joinBindings,
	useOwnerAdapter,
	useCollectionAdapter,
	useElevator,
	type TRootReceiver,
} from '../../../adapter'
import type { TagsItemProps } from './base.component'

export function setupTagsItem(
	getProps: () => TagsItemProps,
	mountId: string,
	receive: TRootReceiver,
) {
	const elevator = useElevator()
	const props = getProps()
	const adapter = createSvelteAdapterContext(TagsItemDescriptor(), {
		ctrl: props.ctrl,
		props,
		mountId,
	})
	const owner = useOwnerAdapter(adapter, getProps, receive)

	const item = createSvelteAdapterContext(
		TagsCollectionItemDescriptor(),
		{ props, mountId },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, { item: adapter.instance, elevator })

	const itemBinding = useCollectionAdapter(item, getProps, () => owner.forwardProps)

	return Object.assign(joinBindings(owner, itemBinding), { context: item.instance.context })
}
