import {
	ListBoxCollectionItemDescriptor,
	ListBoxItemDescriptor,
	TCollectionItemExtension,
} from '@soldy-ui/setup'
import { useAdapter, useAdapterContext, useCollectionAdapter } from '../../../adapter'
import type { ListBoxItemProps } from './base.component'

export function useSetupListBoxItem(props: ListBoxItemProps) {
	const {
		contexts: [adapter, item],
	} = useAdapterContext((create, elevator) => {
		const adapter = create(ListBoxItemDescriptor(), { ctrl: props.ctrl, props })

		const item = create(
			ListBoxCollectionItemDescriptor(),
			{ props },
			{ bundle: adapter.bundle },
		).use(TCollectionItemExtension, { item: adapter, elevator })

		return [adapter, item] as const
	})

	return {
		...useCollectionAdapter(useAdapter(adapter, props), item, props),
		context: item.instance.context,
	}
}
