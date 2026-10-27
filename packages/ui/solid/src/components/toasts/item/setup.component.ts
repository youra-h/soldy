import {
	TCollectionItemExtension,
	ToastsCollectionItemDescriptor,
	ToastsItemDescriptor,
} from '@soldy-ui/setup'
import {
	createSolidAdapterContext,
	useAdapter,
	joinBindings,
	useCollectionAdapter,
	useElevator,
} from '../../../adapter'
import type { ToastsItemProps } from './base.component'

export function setupToastsItem(props: ToastsItemProps) {
	const { elevator } = useElevator()
	const adapter = createSolidAdapterContext(ToastsItemDescriptor(), {
		ctrl: props.ctrl,
		props,
	})

	const item = createSolidAdapterContext(
		ToastsCollectionItemDescriptor(),
		{ props },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, { item: adapter, elevator })

	const itemBinding = useCollectionAdapter(item, props)
	const owner = useAdapter(adapter, props)

	return joinBindings(owner, itemBinding)
}
