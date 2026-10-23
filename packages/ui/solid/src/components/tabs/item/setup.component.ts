import {
	TCollectionItemExtension,
	TabsCollectionItemDescriptor,
	TabsItemDescriptor,
} from '@soldy-ui/setup'
import {
	createSolidAdapterContext,
	useAdapter,
	useCollectionAdapter,
	useElevator,
} from '../../../adapter'
import type { TabsItemProps } from './base.component'

export function setupTabsItem(props: TabsItemProps) {
	const { elevator } = useElevator()
	const adapter = createSolidAdapterContext(TabsItemDescriptor(), { ctrl: props.ctrl, props })
	const owner = useAdapter(adapter, props)

	const item = createSolidAdapterContext(
		TabsCollectionItemDescriptor(),
		{ props },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, { item: adapter.instance, elevator })

	return { ...useCollectionAdapter(item, props, owner), context: item.instance.context }
}
