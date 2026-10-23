import {
	PaginationCollectionItemDescriptor,
	PaginationItemDescriptor,
	TCollectionItemExtension,
} from '@soldy-ui/setup'
import {
	createSolidAdapterContext,
	useAdapter,
	joinBindings,
	useCollectionAdapter,
	useElevator,
} from '../../../adapter'
import type { PaginationItemProps } from './base.component'

export function setupPaginationItem(props: PaginationItemProps) {
	const { elevator } = useElevator()
	const adapter = createSolidAdapterContext(PaginationItemDescriptor(), {
		ctrl: props.ctrl,
		props,
	})
	const owner = useAdapter(adapter, props)

	const item = createSolidAdapterContext(
		PaginationCollectionItemDescriptor(),
		{ props },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, { item: adapter.instance, elevator })

	const itemBinding = useCollectionAdapter(item, props, owner.forwardProps)

	return { ...joinBindings(owner, itemBinding), context: item.instance.context }
}
