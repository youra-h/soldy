import {
	MenuCollectionRadioItemDescriptor,
	MenuRadioItemDescriptor,
	TCollectionItemExtension,
	TMenuRadioItemExtension,
} from '@soldy-ui/setup'
import {
	createSolidAdapterContext,
	useAdapter,
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
	const owner = useAdapter(adapter, props)

	const item = createSolidAdapterContext(
		MenuCollectionRadioItemDescriptor(),
		{ props },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, { item: adapter.instance, elevator })

	return { ...useCollectionAdapter(item, props, owner), context: item.instance.context }
}
