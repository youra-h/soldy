import {
	TCollectionExtension,
	TToastsApiExtension,
	ToastsCollectionDescriptor,
	ToastsDescriptor,
} from '@soldy-ui/setup'
import { useAdapter, useAdapterContext, useCollectionAdapter } from '../../adapter'
import type { ToastsProps } from './base.component'

export function useSetupToasts(props: ToastsProps) {
	const {
		contexts: [adapter, collectionAdapter],
		layer,
	} = useAdapterContext((create, elevator) => {
		const adapter = create(ToastsDescriptor(), { ctrl: props.ctrl, props })

		const collectionAdapter = create(
			ToastsCollectionDescriptor(),
			{
				props,
				options: { owner: adapter.instance, engine: props.engine },
			},
			{ bundle: adapter.bundle },
		)
			.use(TCollectionExtension, { elevator })
			.use(TToastsApiExtension, { elevator })

		return [adapter, collectionAdapter] as const
	})

	return {
		...useCollectionAdapter(useAdapter(adapter, props), collectionAdapter, props),
		layer,
	}
}
