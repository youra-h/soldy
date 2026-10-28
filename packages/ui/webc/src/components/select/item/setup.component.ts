import {
	SelectCollectionItemDescriptor,
	SelectItemDescriptor,
	TCollectionItemExtension,
} from '@soldy-ui/setup'
import type { ISelectItem, TSelectItemCollectionFacade } from '@soldy-ui/core'
import {
	createWebcAdapterContext,
	joinBindings,
	useAdapter,
	useCollectionAdapter,
} from '../../../adapter'
import type { TBinding, TUpdateListener } from '../../../adapter'
import { createWebcElevator } from '../../../adapter/elevator'

export function setupSelectItem(
	host: HTMLElement,
	ctrl: ISelectItem | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<ISelectItem, TSelectItemCollectionFacade> {
	const adapter = createWebcAdapterContext(host, SelectItemDescriptor(), { ctrl, props })

	const itemAdapter = createWebcAdapterContext(
		host,
		SelectCollectionItemDescriptor(),
		{ props },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, { adapter, elevator: createWebcElevator(host) })

	// Фасад первым: в коллекцию опция входит, когда её контекст принят
	const item = useCollectionAdapter(itemAdapter, host, onUpdate)
	const owner = useAdapter(adapter, host, onUpdate)

	return joinBindings(owner, item)
}
