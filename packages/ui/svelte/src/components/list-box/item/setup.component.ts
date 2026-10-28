import {
	ListBoxCollectionItemDescriptor,
	ListBoxItemDescriptor,
	TCollectionItemExtension,
} from '@soldy-ui/setup'
import {
	createSvelteAdapterContext,
	joinBindings,
	useAdapter,
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

	const item = createSvelteAdapterContext(
		ListBoxCollectionItemDescriptor(),
		{ props, mountId },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, { item: adapter.instance, member: adapter, elevator })

	const itemBinding = useCollectionAdapter(item, getProps)
	const owner = useAdapter(adapter, getProps, receive)

	return Object.assign(joinBindings(owner, itemBinding), { context: item.instance.context })
}
