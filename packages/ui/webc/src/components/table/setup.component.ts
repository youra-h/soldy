import {
	TCollectionExtension,
	TVirtualCollectionExtension,
	TableCollectionDescriptor,
	TableDescriptor,
} from '@soldy-ui/setup'
import type { ITable, TTableCollectionFacade } from '@soldy-ui/core'
import {
	createWebcAdapterContext,
	joinBindings,
	useAdapter,
	useCollectionAdapter,
} from '../../adapter'
import type { TBinding, TUpdateListener } from '../../adapter'
import { createWebcElevator } from '../../adapter/elevator'

export function setupTable(
	host: HTMLElement,
	ctrl: ITable | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<ITable, TTableCollectionFacade> {
	const adapter = createWebcAdapterContext(host, TableDescriptor(), { ctrl, props })
	const elevator = createWebcElevator(host)

	const collectionAdapter = createWebcAdapterContext(
		host,
		TableCollectionDescriptor(),
		{ props, options: { owner: adapter.instance, engine: props['engine'] } },
		{ bundle: adapter.bundle },
	)
		.use(TCollectionExtension, { elevator })
		// Окно обёртки `Virtual` над таблицей
		.use(TVirtualCollectionExtension, { elevator })

	const facade = useCollectionAdapter(collectionAdapter, host, onUpdate)
	const owner = useAdapter(adapter, host, onUpdate)

	return joinBindings(owner, facade)
}
