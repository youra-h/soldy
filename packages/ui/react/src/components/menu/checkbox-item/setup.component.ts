import {
	MenuCheckboxItemDescriptor,
	MenuCollectionCheckboxItemDescriptor,
	TCollectionItemExtension,
} from '@soldy-ui/setup'
import { useAdapter, useAdapterContext, useCollectionAdapter } from '../../../adapter'
import type { MenuCheckboxItemProps } from './base.component'

export function useSetupMenuCheckboxItem(props: MenuCheckboxItemProps) {
	const {
		contexts: [adapter, item],
	} = useAdapterContext((create, elevator) => {
		const adapter = create(MenuCheckboxItemDescriptor(), { ctrl: props.ctrl, props })

		const item = create(
			MenuCollectionCheckboxItemDescriptor(),
			{ props },
			{ bundle: adapter.bundle },
		).use(TCollectionItemExtension, { item: adapter.instance, elevator })

		return [adapter, item] as const
	})

	return {
		...useCollectionAdapter(useAdapter(adapter, props), item, props),
		context: item.instance.context,
	}
}
