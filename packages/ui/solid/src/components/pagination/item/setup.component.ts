import {
	PaginationCollectionItemDescriptor,
	PaginationItemDescriptor,
	TCollectionItemExtension,
} from '@soldy-ui/setup'
import {
	createSolidAdapterContext,
	useAdapter,
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

	return { ...useCollectionAdapter(item, props, owner), context: item.instance.context }
}
