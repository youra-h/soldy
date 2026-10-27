import {
	MenuCheckboxItemDescriptor,
	MenuCollectionCheckboxItemDescriptor,
	TCollectionItemExtension,
} from '@soldy-ui/setup'
import {
	createSolidAdapterContext,
	useOwnerAdapter,
	joinBindings,
	useCollectionAdapter,
	useElevator,
} from '../../../adapter'
import type { MenuCheckboxItemProps } from './base.component'

export function setupMenuCheckboxItem(props: MenuCheckboxItemProps) {
	const { elevator } = useElevator()
	const adapter = createSolidAdapterContext(MenuCheckboxItemDescriptor(), {
		ctrl: props.ctrl,
		props,
	})
	const owner = useOwnerAdapter(adapter, props)

	const item = createSolidAdapterContext(
		MenuCollectionCheckboxItemDescriptor(),
		{ props },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, { item: adapter.instance, elevator })

	const itemBinding = useCollectionAdapter(item, props, owner.forwardProps)

	return { ...joinBindings(owner, itemBinding), context: item.instance.context }
}
