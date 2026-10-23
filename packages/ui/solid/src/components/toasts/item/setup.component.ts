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
	const owner = useAdapter(adapter, props)

	const item = createSolidAdapterContext(
		ToastsCollectionItemDescriptor(),
		{ props },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, { item: adapter.instance, elevator })

	const itemBinding = useCollectionAdapter(item, props, owner.forwardProps)

	return joinBindings(owner, itemBinding)
}
