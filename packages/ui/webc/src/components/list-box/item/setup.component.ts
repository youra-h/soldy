import {
	ListBoxCollectionItemDescriptor,
	ListBoxItemDescriptor,
	TCollectionItemExtension,
} from '@soldy-ui/setup'
import type { IListBoxItem, TListBoxItemCollectionFacade } from '@soldy-ui/core'
import {
	createWebcAdapterContext,
	joinBindings,
	useAdapter,
	useCollectionAdapter,
} from '../../../adapter'
import type { TBinding, TUpdateListener } from '../../../adapter'
import { createWebcElevator } from '../../../adapter/elevator'

export function setupListBoxItem(
	host: HTMLElement,
	ctrl: IListBoxItem | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<IListBoxItem, TListBoxItemCollectionFacade> {
	const adapter = createWebcAdapterContext(host, ListBoxItemDescriptor(), { ctrl, props })

	const itemAdapter = createWebcAdapterContext(
		host,
		ListBoxCollectionItemDescriptor(),
		{ props },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, { adapter, elevator: createWebcElevator(host) })

	// Фасад первым, как у Vue: в коллекцию элемент входит, когда его контекст принят
	const item = useCollectionAdapter(itemAdapter, host, onUpdate)
	const owner = useAdapter(adapter, host, onUpdate)

	return joinBindings(owner, item)
}
