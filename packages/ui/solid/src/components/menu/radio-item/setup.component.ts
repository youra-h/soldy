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
	const owner = useAdapter(adapter, props)

	const item = createSolidAdapterContext(
		MenuCollectionRadioItemDescriptor(),
		{ props },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, { item: adapter.instance, elevator })

	const itemBinding = useCollectionAdapter(item, props, owner.forwardProps)

	return {
		...joinBindings(owner, itemBinding),
		context: item.instance.context,
		/** Строка — экземпляр, которым владеет пункт: кнопка берёт его целиком (`ctrl`). */
		row: adapter.instance.row,
	}
}
