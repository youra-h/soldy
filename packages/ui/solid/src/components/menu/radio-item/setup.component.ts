import {
	MenuCollectionRadioItemDescriptor,
	MenuRadioItemDescriptor,
	TCollectionItemExtension,
	TMenuRadioItemExtension,
} from '@soldy-ui/setup'
import {
	createSolidAdapterContext,
	useAdapter,
	joinBindings,
	useCollectionAdapter,
	useElevator,
} from '../../../adapter'
import type { MenuRadioItemProps } from './base.component'

export function setupMenuRadioItem(props: MenuRadioItemProps) {
	const { elevator } = useElevator()
	const adapter = createSolidAdapterContext(MenuRadioItemDescriptor(), {
		ctrl: props.ctrl,
		props,
	}).use(TMenuRadioItemExtension, { elevator })

	const item = createSolidAdapterContext(
		MenuCollectionRadioItemDescriptor(),
		{ props },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, { item: adapter.instance, member: adapter, elevator })

	const itemBinding = useCollectionAdapter(item, props)
	const owner = useAdapter(adapter, props)

	return { ...joinBindings(owner, itemBinding), context: item.instance.context }
}
