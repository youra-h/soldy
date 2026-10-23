import {
	SelectCollectionDescriptor,
	SelectDescriptor,
	TCollectionExtension,
	TFieldControlExtension,
	TVirtualCollectionExtension,
} from '@soldy-ui/setup'
import {
	createSolidAdapterContext,
	useAdapter,
	useCollectionAdapter,
	useElevator,
} from '../../adapter'
import type { SelectProps } from './base.component'

export function setupSelect(props: SelectProps) {
	const { elevator, layer } = useElevator()
	const adapter = createSolidAdapterContext(SelectDescriptor(), {
		ctrl: props.ctrl,
		props,
	}).use(TFieldControlExtension, { elevator })

	const owner = useAdapter(adapter, props)

	const collectionAdapter = createSolidAdapterContext(
		SelectCollectionDescriptor(),
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
		field: adapter.instance.field,
		layer,
	}
}
