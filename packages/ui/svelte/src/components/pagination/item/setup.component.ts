import {
	PaginationCollectionItemDescriptor,
	PaginationItemDescriptor,
	TCollectionItemExtension,
} from '@soldy-ui/setup'
import {
	createSvelteAdapterContext,
	joinBindings,
	useOwnerAdapter,
	useCollectionAdapter,
	useElevator,
	type TRootReceiver,
} from '../../../adapter'
import type { PaginationItemProps } from './base.component'

export function setupPaginationItem(
	getProps: () => PaginationItemProps,
	mountId: string,
	receive: TRootReceiver,
) {
	const elevator = useElevator()
	const props = getProps()
	const adapter = createSvelteAdapterContext(PaginationItemDescriptor(), {
		ctrl: props.ctrl,
		props,
		mountId,
	})
	const owner = useOwnerAdapter(adapter, getProps, receive)

	const item = createSvelteAdapterContext(
		PaginationCollectionItemDescriptor(),
		{ props, mountId },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, { item: adapter.instance, elevator })

	const itemBinding = useCollectionAdapter(item, getProps, () => owner.forwardProps)

	return Object.assign(joinBindings(owner, itemBinding), { context: item.instance.context })
}
