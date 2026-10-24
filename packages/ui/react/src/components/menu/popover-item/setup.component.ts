import {
	MenuCollectionItemDescriptor,
	MenuPopoverItemDescriptor,
	TCollectionItemExtension,
} from '@soldy-ui/setup'
import {
	useAdapter,
	useAdapterContext,
	useCollectionAdapter,
	useRootElement,
} from '../../../adapter'
import type { MenuPopoverItemProps } from './base.component'

export function useSetupMenuPopoverItem(props: MenuPopoverItemProps) {
	const {
		contexts: [adapter, item],
	} = useAdapterContext((create, elevator) => {
		const adapter = create(MenuPopoverItemDescriptor(), { ctrl: props.ctrl, props })

		const item = create(
			MenuCollectionItemDescriptor(),
			{ props },
			{ bundle: adapter.bundle },
		).use(TCollectionItemExtension, { item: adapter.instance, elevator })

		return [adapter, item] as const
	})

	const binding = useCollectionAdapter(useAdapter(adapter, props), item, props)

	return {
		...binding,
		context: item.instance.context,
		rootElement: useRootElement(binding.root),
		/** Строка — экземпляр, которым владеет пункт: кнопка берёт его целиком (`ctrl`). */
		row: adapter.instance.row,
	}
}
