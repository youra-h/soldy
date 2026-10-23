import {
	MenuCollectionItemDescriptor,
	MenuSubmenuCollectionDescriptor,
	MenuSubmenuDescriptor,
	TCollectionExtension,
	TCollectionItemExtension,
} from '@soldy-ui/setup'
import {
	createSvelteAdapterContext,
	useAdapter,
	useCollectionAdapter,
	useElevator,
	type TRootReceiver,
} from '../../../adapter'
import type { MenuSubmenuProps } from './base.component'

export function setupMenuSubmenu(
	getProps: () => MenuSubmenuProps,
	mountId: string,
	receive: TRootReceiver,
) {
	const elevator = useElevator()
	const props = getProps()
	const adapter = createSvelteAdapterContext(MenuSubmenuDescriptor(), {
		ctrl: props.ctrl,
		props,
		mountId,
	})

	const owner = useAdapter(adapter, getProps, receive)

	// В меню над ним — пункт
	const item = createSvelteAdapterContext(
		MenuCollectionItemDescriptor(),
		{ props, mountId },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, { item: adapter.instance, elevator })

	// Для своих пунктов — меню
	const collectionAdapter = createSvelteAdapterContext(
		MenuSubmenuCollectionDescriptor(),
		{ props, mountId, options: { owner: adapter.instance, engine: props.engine } },
		{ bundle: adapter.bundle },
	).use(TCollectionExtension, { elevator })

	const binding = useCollectionAdapter(
		collectionAdapter,
		getProps,
		useCollectionAdapter(item, getProps, owner),
	)

	return Object.assign(binding, { context: item.instance.context })
}
