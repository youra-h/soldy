import {
	SelectCollectionItemDescriptor,
	SelectItemDescriptor,
	TCollectionItemExtension,
} from '@soldy-ui/setup'
import { useAdapter, useAdapterContext, useCollectionAdapter } from '../../../adapter'
import type { SelectItemProps } from './base.component'

export function useSetupSelectItem(props: SelectItemProps) {
	const {
		contexts: [adapter, item],
	} = useAdapterContext((create, elevator) => {
		const adapter = create(SelectItemDescriptor(), { ctrl: props.ctrl, props })

		const item = create(
			SelectCollectionItemDescriptor(),
			{ props },
			{ bundle: adapter.bundle },
		).use(TCollectionItemExtension, { item: adapter.instance, member: adapter, elevator })

		return [adapter, item] as const
	})

	return {
		...useCollectionAdapter(useAdapter(adapter, props), item, props),
		context: item.instance.context,
	}
}
