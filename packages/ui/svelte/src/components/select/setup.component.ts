import {
	SelectCollectionDescriptor,
	SelectDescriptor,
	TCollectionExtension,
	TFieldControlExtension,
	TVirtualCollectionExtension,
} from '@soldy-ui/setup'
import {
	createSvelteAdapterContext,
	joinBindings,
	useAdapter,
	useCollectionAdapter,
	useElevator,
	type TRootReceiver,
} from '../../adapter'
import type { SelectProps } from './base.component'

export function setupSelect(getProps: () => SelectProps, mountId: string, receive: TRootReceiver) {
	const elevator = useElevator()
	const props = getProps()
	const adapter = createSvelteAdapterContext(SelectDescriptor(), {
		ctrl: props.ctrl,
		props,
		mountId,
	}).use(TFieldControlExtension, { elevator })

	const owner = useAdapter(adapter, getProps, receive)

	const collectionAdapter = createSvelteAdapterContext(
		SelectCollectionDescriptor(),
		{
			props,
			mountId,
			options: { owner: adapter.instance, engine: props.engine },
		},
		{ bundle: adapter.bundle },
	)
		.use(TCollectionExtension, { elevator })
		.use(TVirtualCollectionExtension, { elevator })

	const collectionBinding = useCollectionAdapter(
		collectionAdapter,
		getProps,
		() => owner.forwardProps,
	)

	return joinBindings(owner, collectionBinding)
}
