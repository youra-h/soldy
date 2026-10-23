import { MenuCollectionDescriptor, MenuDescriptor, TCollectionExtension } from '@soldy-ui/setup'
import { useAdapter, useAdapterContext, useCollectionAdapter, useRootElement } from '../../adapter'
import type { MenuProps } from './base.component'

export function useSetupMenu(props: MenuProps) {
	const {
		contexts: [adapter, collectionAdapter],
		layer,
	} = useAdapterContext((create, elevator) => {
		const adapter = create(MenuDescriptor(), { ctrl: props.ctrl, props })

		const collectionAdapter = create(
			MenuCollectionDescriptor(),
			{
				props,
				options: { owner: adapter.instance, engine: props.engine },
			},
			{ bundle: adapter.bundle },
		).use(TCollectionExtension, { elevator })

		return [adapter, collectionAdapter] as const
	})

	const binding = useCollectionAdapter(useAdapter(adapter, props), collectionAdapter, props)

	return {
		...binding,
		rootElement: useRootElement(binding.root),
		layer,
	}
}
