import {
	MenuCollectionItemDescriptor,
	MenuItemDescriptor,
	TCollectionItemExtension,
} from '@soldy-ui/setup'
import {
	createSolidAdapterContext,
	useAdapter,
	useCollectionAdapter,
	useElevator,
} from '../../../adapter'
import type { MenuItemProps } from './base.component'

export function setupMenuItem(props: MenuItemProps) {
	const { elevator } = useElevator()
	const adapter = createSolidAdapterContext(MenuItemDescriptor(), { ctrl: props.ctrl, props })
	const owner = useAdapter(adapter, props)

	const item = createSolidAdapterContext(
		MenuCollectionItemDescriptor(),
		{ props },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, { item: adapter.instance, elevator })

	return { ...useCollectionAdapter(item, props, owner), context: item.instance.context }
}
