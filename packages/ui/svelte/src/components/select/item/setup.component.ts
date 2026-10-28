import {
	SelectCollectionItemDescriptor,
	SelectItemDescriptor,
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
import type { SelectItemProps } from './base.component'

export function setupSelectItem(
	getProps: () => SelectItemProps,
	mountId: string,
	receive: TRootReceiver,
) {
	const elevator = useElevator()
	const props = getProps()
	const adapter = createSvelteAdapterContext(SelectItemDescriptor(), {
		ctrl: props.ctrl,
		props,
		mountId,
	})

	const item = createSvelteAdapterContext(
		SelectCollectionItemDescriptor(),
		{ props, mountId },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, { item: adapter.instance, member: adapter, elevator })

	const itemBinding = useCollectionAdapter(item, getProps)
	const owner = useAdapter(adapter, getProps, receive)

	return Object.assign(joinBindings(owner, itemBinding), { context: item.instance.context })
}
