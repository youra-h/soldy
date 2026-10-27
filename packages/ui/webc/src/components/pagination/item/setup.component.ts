import {
	PaginationCollectionItemDescriptor,
	PaginationItemDescriptor,
	TCollectionItemExtension,
} from '@soldy-ui/setup'
import type { IPaginationItem, TPaginationItemCollectionFacade } from '@soldy-ui/core'
import {
	createWebcAdapterContext,
	joinBindings,
	useAdapter,
	useCollectionAdapter,
} from '../../../adapter'
import type { TBinding, TUpdateListener } from '../../../adapter'
import { createWebcElevator } from '../../../adapter/elevator'

export function setupPaginationItem(
	host: HTMLElement,
	ctrl: IPaginationItem | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<IPaginationItem, TPaginationItemCollectionFacade> {
	const adapter = createWebcAdapterContext(host, PaginationItemDescriptor(), { ctrl, props })

	const itemAdapter = createWebcAdapterContext(
		host,
		PaginationCollectionItemDescriptor(),
		{ props },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, {
		item: adapter,
		elevator: createWebcElevator(host),
	})

	// Фасад — первым: в коллекцию страница входит, когда её контекст принят
	const item = useCollectionAdapter(itemAdapter, host, onUpdate)
	const owner = useAdapter(adapter, host, onUpdate)

	return joinBindings(owner, item)
}
