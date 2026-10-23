import {
	MenuCollectionItemDescriptor,
	MenuSubmenuCollectionDescriptor,
	MenuSubmenuDescriptor,
	TCollectionExtension,
	TCollectionItemExtension,
} from '@soldy-ui/setup'
import {
	createSolidAdapterContext,
	useAdapter,
	useCollectionAdapter,
	useElevator,
} from '../../../adapter'
import type { MenuSubmenuProps } from './base.component'

/** Три контекста: свой, пункт в меню над ним (`up()`) и меню своих пунктов (`down()`). */
export function setupMenuSubmenu(props: MenuSubmenuProps) {
	const { elevator, layer } = useElevator()
	const adapter = createSolidAdapterContext(MenuSubmenuDescriptor(), {
		ctrl: props.ctrl,
		props,
	})
	const owner = useAdapter(adapter, props)

	const item = createSolidAdapterContext(
		MenuCollectionItemDescriptor(),
		{ props },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, { item: adapter.instance, elevator })

	const asItem = useCollectionAdapter(item, props, owner)

	const collectionAdapter = createSolidAdapterContext(
		MenuSubmenuCollectionDescriptor(),
		{ props, options: { owner: adapter.instance, engine: props.engine } },
		{ bundle: adapter.bundle },
	).use(TCollectionExtension, { elevator })

	return {
		...useCollectionAdapter(collectionAdapter, props, asItem),
		context: item.instance.context,
		layer,
	}
}
