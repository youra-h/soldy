import {
	MenuCheckboxItemDescriptor,
	MenuCollectionCheckboxItemDescriptor,
	TCollectionItemExtension,
} from '@soldy-ui/setup'
import {
	createSolidAdapterContext,
	useAdapter,
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
	const owner = useAdapter(adapter, props)

	const item = createSolidAdapterContext(
		MenuCollectionCheckboxItemDescriptor(),
		{ props },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, { item: adapter.instance, elevator })

	return { ...useCollectionAdapter(item, props, owner), context: item.instance.context }
}
