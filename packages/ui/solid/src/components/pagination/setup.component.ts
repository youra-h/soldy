import {
	PaginationCollectionDescriptor,
	PaginationDescriptor,
	TCollectionExtension,
} from '@soldy-ui/setup'
import {
	createSolidAdapterContext,
	useAdapter,
	joinBindings,
	useCollectionAdapter,
	useElevator,
} from '../../adapter'
import type { PaginationProps } from './base.component'

export function setupPagination(props: PaginationProps) {
	const { elevator, layer } = useElevator()
	const adapter = createSolidAdapterContext(PaginationDescriptor(), {
		ctrl: props.ctrl,
		props,
	})

	const collectionAdapter = createSolidAdapterContext(
		PaginationCollectionDescriptor(),
		{
			props,
			options: { owner: adapter.instance, engine: props.engine },
		},
		{ bundle: adapter.bundle },
	).use(TCollectionExtension, { elevator })

	const collectionBinding = useCollectionAdapter(collectionAdapter, props)
	const owner = useAdapter(adapter, props)

	return { ...joinBindings(owner, collectionBinding), layer }
}
