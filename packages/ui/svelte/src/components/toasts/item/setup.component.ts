import {
	TCollectionItemExtension,
	ToastsCollectionItemDescriptor,
	ToastsItemDescriptor,
} from '@soldy-ui/setup'
import {
	createSvelteAdapterContext,
	joinBindings,
	useAdapter,
	useCollectionAdapter,
	useElevator,
	type TRootReceiver,
} from '../../../adapter'
import type { ToastsItemProps } from './base.component'

export function setupToastsItem(
	getProps: () => ToastsItemProps,
	mountId: string,
	receive: TRootReceiver,
) {
	const elevator = useElevator()
	const props = getProps()
	const adapter = createSvelteAdapterContext(ToastsItemDescriptor(), {
		ctrl: props.ctrl,
		props,
		mountId,
	})

	const item = createSvelteAdapterContext(
		ToastsCollectionItemDescriptor(),
		{ props, mountId },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, { item: adapter.instance, member: adapter, elevator })

	const itemBinding = useCollectionAdapter(item, getProps)
	const owner = useAdapter(adapter, getProps, receive)

	return joinBindings(owner, itemBinding)
}
