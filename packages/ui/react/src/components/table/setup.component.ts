import {
	TCollectionExtension,
	TVirtualCollectionExtension,
	TableCollectionDescriptor,
	TableDescriptor,
} from '@soldy-ui/setup'
import { useAdapter, useAdapterContext, useCollectionAdapter } from '../../adapter'
import type { TableProps } from './base.component'

export function useSetupTable(props: TableProps) {
	const {
		contexts: [adapter, collectionAdapter],
		layer,
	} = useAdapterContext((create, elevator) => {
		const adapter = create(TableDescriptor(), { ctrl: props.ctrl, props })

		const collectionAdapter = create(
			TableCollectionDescriptor(),
			{
				props,
				options: { owner: adapter.instance, engine: props.engine },
			},
			{ bundle: adapter.bundle },
		)
			.use(TCollectionExtension, { elevator })
			// Окно обёртки `Virtual`: подхват при сборке, подписка на неё — при коммите
			.use(TVirtualCollectionExtension, { elevator })

		return [adapter, collectionAdapter] as const
	})

	return {
		...useCollectionAdapter(useAdapter(adapter, props), collectionAdapter, props),
		layer,
		// Чекбокс «выбрать все» держит фасад, состоянием он не отдаётся
		facade: collectionAdapter.instance,
	}
}
