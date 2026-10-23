import {
	TCollectionItemExtension,
	TableCollectionRowDescriptor,
	TableRowDescriptor,
} from '@soldy-ui/setup'
import {
	createSvelteAdapterContext,
	joinBindings,
	useAdapter,
	useCollectionAdapter,
	useElevator,
	type TRootReceiver,
} from '../../../adapter'
import type { TableRowProps } from './base.component'

export function setupTableRow(
	getProps: () => TableRowProps,
	mountId: string,
	receive: TRootReceiver,
) {
	const elevator = useElevator()
	const props = getProps()
	const adapter = createSvelteAdapterContext(TableRowDescriptor(), {
		ctrl: props.ctrl,
		props,
		mountId,
	})
	const owner = useAdapter(adapter, getProps, receive)

	const item = createSvelteAdapterContext(
		TableCollectionRowDescriptor(),
		{ props, mountId },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, { item: adapter.instance, elevator })

	const itemBinding = useCollectionAdapter(item, getProps, () => owner.forwardProps)

	return Object.assign(joinBindings(owner, itemBinding), { context: item.instance.context })
}
