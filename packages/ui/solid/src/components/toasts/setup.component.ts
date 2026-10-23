import {
	TCollectionExtension,
	TToastsApiExtension,
	ToastsCollectionDescriptor,
	ToastsDescriptor,
} from '@soldy-ui/setup'
import {
	createSolidAdapterContext,
	useAdapter,
	useCollectionAdapter,
	useElevator,
} from '../../adapter'
import type { ToastsProps } from './base.component'

export function setupToasts(props: ToastsProps) {
	const { elevator, layer } = useElevator()
	const adapter = createSolidAdapterContext(ToastsDescriptor(), { ctrl: props.ctrl, props })
	const owner = useAdapter(adapter, props)

	const collectionAdapter = createSolidAdapterContext(
		ToastsCollectionDescriptor(),
		{
			props,
			options: { owner: adapter.instance, engine: props.engine },
		},
		{ bundle: adapter.bundle },
	)
		.use(TCollectionExtension, { elevator })
		.use(TToastsApiExtension, { elevator })

	return { ...useCollectionAdapter(collectionAdapter, props, owner), layer }
}
