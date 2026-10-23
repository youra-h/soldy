import {
	SelectCollectionDescriptor,
	SelectDescriptor,
	TCollectionExtension,
	TFieldControlExtension,
	TVirtualCollectionExtension,
} from '@soldy-ui/setup'
import { useAdapter, useAdapterContext, useCollectionAdapter, useRootElement } from '../../adapter'
import type { SelectProps } from './base.component'

export function useSetupSelect(props: SelectProps) {
	const {
		contexts: [adapter, collectionAdapter],
		layer,
	} = useAdapterContext((create, elevator) => {
		const adapter = create(SelectDescriptor(), { ctrl: props.ctrl, props }).use(
			TFieldControlExtension,
			{ elevator },
		)

		const collectionAdapter = create(
			SelectCollectionDescriptor(),
			{
				props,
				options: { owner: adapter.instance, engine: props.engine },
			},
			{ bundle: adapter.bundle },
		)
			.use(TCollectionExtension, { elevator })
			.use(TVirtualCollectionExtension, { elevator })

		return [adapter, collectionAdapter] as const
	})

	const binding = useCollectionAdapter(useAdapter(adapter, props), collectionAdapter, props)

	return {
		...binding,
		rootElement: useRootElement(binding.root),
		field: adapter.instance.field,
		layer,
	}
}
