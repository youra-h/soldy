import {
	TCollectionItemExtension,
	ToastsCollectionItemDescriptor,
	ToastsItemDescriptor,
} from '@soldy-ui/setup'
import { useAdapter, useAdapterContext, useCollectionAdapter } from '../../../adapter'
import type { ToastsItemProps } from './base.component'

export function useSetupToastsItem(props: ToastsItemProps) {
	const {
		contexts: [adapter, item],
	} = useAdapterContext((create, elevator) => {
		const adapter = create(ToastsItemDescriptor(), { ctrl: props.ctrl, props })

		const item = create(
			ToastsCollectionItemDescriptor(),
			{ props },
			{ bundle: adapter.bundle },
		).use(TCollectionItemExtension, { item: adapter.instance, member: adapter, elevator })

		return [adapter, item] as const
	})

	return useCollectionAdapter(useAdapter(adapter, props), item, props)
}
