import {
	MenuCollectionRadioItemDescriptor,
	MenuRadioItemDescriptor,
	TCollectionItemExtension,
	TMenuRadioItemExtension,
} from '@soldy-ui/setup'
import {
	createSvelteAdapterContext,
	useAdapter,
	useCollectionAdapter,
	useElevator,
	type TRootReceiver,
} from '../../../adapter'
import type { MenuRadioItemProps } from './base.component'

export function setupMenuRadioItem(
	getProps: () => MenuRadioItemProps,
	mountId: string,
	receive: TRootReceiver,
) {
	const elevator = useElevator()
	const props = getProps()
	const adapter = createSvelteAdapterContext(MenuRadioItemDescriptor(), {
		ctrl: props.ctrl,
		props,
		mountId,
	}).use(TMenuRadioItemExtension, { elevator })
	const owner = useAdapter(adapter, getProps, receive)

	const item = createSvelteAdapterContext(
		MenuCollectionRadioItemDescriptor(),
		{ props, mountId },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, { item: adapter.instance, elevator })

	const binding = useCollectionAdapter(item, getProps, owner)

	return Object.assign(binding, { context: item.instance.context })
}
