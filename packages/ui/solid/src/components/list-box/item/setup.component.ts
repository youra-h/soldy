import {
	ListBoxCollectionItemDescriptor,
	ListBoxItemDescriptor,
	TCollectionItemExtension,
} from '@soldy-ui/setup'
import {
	createSolidAdapterContext,
	useOwnerAdapter,
	joinBindings,
	useCollectionAdapter,
	useElevator,
} from '../../../adapter'
import type { ListBoxItemProps } from './base.component'

/** `context` — разметке: выбор — метод item-адаптера. */
export function setupListBoxItem(props: ListBoxItemProps) {
	const { elevator } = useElevator()
	const adapter = createSolidAdapterContext(ListBoxItemDescriptor(), { ctrl: props.ctrl, props })
	const owner = useOwnerAdapter(adapter, props)

	const item = createSolidAdapterContext(
		ListBoxCollectionItemDescriptor(),
		{ props },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, { item: adapter.instance, elevator })

	const itemBinding = useCollectionAdapter(item, props, owner.forwardProps)

	return { ...joinBindings(owner, itemBinding), context: item.instance.context }
}
