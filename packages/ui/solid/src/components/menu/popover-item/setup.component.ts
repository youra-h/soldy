import {
	MenuCollectionItemDescriptor,
	MenuPopoverItemDescriptor,
	TCollectionItemExtension,
} from '@soldy-ui/setup'
import {
	createSolidAdapterContext,
	useAdapter,
	useCollectionAdapter,
	useElevator,
} from '../../../adapter'
import type { MenuPopoverItemProps } from './base.component'

export function setupMenuPopoverItem(props: MenuPopoverItemProps) {
	const { elevator } = useElevator()
	const adapter = createSolidAdapterContext(MenuPopoverItemDescriptor(), {
		ctrl: props.ctrl,
		props,
	})
	const owner = useAdapter(adapter, props)

	const item = createSolidAdapterContext(
		MenuCollectionItemDescriptor(),
		{ props },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, { item: adapter.instance, elevator })

	return { ...useCollectionAdapter(item, props, owner), context: item.instance.context }
}
