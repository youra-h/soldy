import {
	TCollectionExtension,
	TVirtualCollectionExtension,
	TableCollectionDescriptor,
	TableDescriptor,
} from '@soldy-ui/setup'
import {
	createSolidAdapterContext,
	useAdapter,
	useCollectionAdapter,
	useElevator,
} from '../../adapter'
import type { TableProps } from './base.component'

/** Разметке уходит и фасад: чекбокс «выбрать все» (`selectAll`) состоянием не отдаётся. */
export function setupTable(props: TableProps) {
	const { elevator, layer } = useElevator()
	const adapter = createSolidAdapterContext(TableDescriptor(), { ctrl: props.ctrl, props })
	const owner = useAdapter(adapter, props)

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

	return {
		...useCollectionAdapter(collectionAdapter, props, owner),
		layer,
		facade: collectionAdapter.instance,
	}
}
