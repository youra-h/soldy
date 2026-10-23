import {
	TCollectionItemExtension,
	TableCollectionRowDescriptor,
	TableRowDescriptor,
} from '@soldy-ui/setup'
import type { ITableRow, TTableRowCollectionFacade } from '@soldy-ui/core'
import {
	createWebcAdapterContext,
	joinBindings,
	useAdapter,
	useCollectionAdapter,
} from '../../../adapter'
import type { TBinding, TUpdateListener } from '../../../adapter'
import { createWebcElevator } from '../../../adapter/elevator'

export function setupTableRow(
	host: HTMLElement,
	ctrl: ITableRow | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<ITableRow, TTableRowCollectionFacade> {
	const adapter = createWebcAdapterContext(host, TableRowDescriptor(), { ctrl, props })

	const itemAdapter = createWebcAdapterContext(
		host,
		TableCollectionRowDescriptor(),
		{ props },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, {
		item: adapter.instance,
		elevator: createWebcElevator(host),
	})

	// Фасад первым: в коллекцию строка входит, когда её контекст принят
	const item = useCollectionAdapter(itemAdapter, host, onUpdate)
	const owner = useAdapter(adapter, host, onUpdate)

	return joinBindings(owner, item)
}
