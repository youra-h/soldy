import {
	ListBoxCollectionItemDescriptor,
	ListBoxItemDescriptor,
	TCollectionItemExtension,
} from '@soldy-ui/setup'
import {
	createSvelteAdapterContext,
	joinBindings,
	useOwnerAdapter,
	useCollectionAdapter,
	useElevator,
	type TRootReceiver,
} from '../../../adapter'
import type { ListBoxItemProps } from './base.component'

export function setupListBoxItem(
	getProps: () => ListBoxItemProps,
	mountId: string,
	receive: TRootReceiver,
) {
	const elevator = useElevator()
	const props = getProps()
	const adapter = createSvelteAdapterContext(ListBoxItemDescriptor(), {
		ctrl: props.ctrl,
		props,
		mountId,
	})
	const owner = useOwnerAdapter(adapter, getProps, receive)

	const item = createSvelteAdapterContext(
		ListBoxCollectionItemDescriptor(),
		{ props, mountId },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, { item: adapter.instance, elevator })

	const itemBinding = useCollectionAdapter(item, getProps, () => owner.forwardProps)

	return Object.assign(joinBindings(owner, itemBinding), { context: item.instance.context })
}
