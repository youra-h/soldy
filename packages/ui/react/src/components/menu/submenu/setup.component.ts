import {
	MenuCollectionItemDescriptor,
	MenuSubmenuCollectionDescriptor,
	MenuSubmenuDescriptor,
	TCollectionExtension,
	TCollectionItemExtension,
} from '@soldy-ui/setup'
import {
	useAdapter,
	useAdapterContext,
	useCollectionAdapter,
	useRootElement,
} from '../../../adapter'
import type { MenuSubmenuProps } from './base.component'

export function useSetupMenuSubmenu(props: MenuSubmenuProps) {
	const {
		contexts: [adapter, item, collectionAdapter],
		layer,
	} = useAdapterContext((create, elevator) => {
		const adapter = create(MenuSubmenuDescriptor(), { ctrl: props.ctrl, props })

		// Фасад пункта читает лифт меню над ним, фасад меню пишет свой: порядок вызовов не важен
		const item = create(
			MenuCollectionItemDescriptor(),
			{ props },
			{ bundle: adapter.bundle },
		).use(TCollectionItemExtension, { item: adapter.instance, elevator })

		const collectionAdapter = create(
			MenuSubmenuCollectionDescriptor(),
			{ props, options: { owner: adapter.instance, engine: props.engine } },
			{ bundle: adapter.bundle },
		).use(TCollectionExtension, { elevator })

		return [adapter, item, collectionAdapter] as const
	})

	const binding = useCollectionAdapter(
		useCollectionAdapter(useAdapter(adapter, props), item, props),
		collectionAdapter,
		props,
	)

	return {
		...binding,
		context: item.instance.context,
		rootElement: useRootElement(binding.root),
		layer,
		/** Строка — экземпляр, которым владеет пункт: кнопка берёт его целиком (`ctrl`). */
		row: adapter.instance.row,
	}
}
