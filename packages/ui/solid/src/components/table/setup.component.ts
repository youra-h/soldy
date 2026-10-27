import {
	TCollectionExtension,
	TVirtualCollectionExtension,
	TableCollectionDescriptor,
	TableDescriptor,
} from '@soldy-ui/setup'
import {
	createSolidAdapterContext,
	useOwnerAdapter,
	joinBindings,
	useCollectionAdapter,
	useElevator,
} from '../../adapter'
import type { TableProps } from './base.component'

/** Разметке уходит и фасад: чекбокс «выбрать все» (`selectAll`) состоянием не отдаётся. */
export function setupTable(props: TableProps) {
	const { elevator, layer } = useElevator()
	const adapter = createSolidAdapterContext(TableDescriptor(), { ctrl: props.ctrl, props })
	const owner = useOwnerAdapter(adapter, props)

	const collectionAdapter = createSolidAdapterContext(
		TableCollectionDescriptor(),
		{
			props,
			options: { owner: adapter.instance, engine: props.engine },
		},
		{ bundle: adapter.bundle },
	)
		.use(TCollectionExtension, { elevator })
		.use(TVirtualCollectionExtension, { elevator })

	const collectionBinding = useCollectionAdapter(collectionAdapter, props, owner.forwardProps)

	return {
		...joinBindings(owner, collectionBinding),
		layer,
		facade: collectionAdapter.instance,
	}
}
