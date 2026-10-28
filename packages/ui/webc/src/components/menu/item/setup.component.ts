import {
	MenuCollectionItemDescriptor,
	MenuItemDescriptor,
	TCollectionItemExtension,
} from '@soldy-ui/setup'
import type { IMenuItem, TMenuItemCollectionFacade } from '@soldy-ui/core'
import {
	createWebcAdapterContext,
	joinBindings,
	useAdapter,
	useCollectionAdapter,
} from '../../../adapter'
import type { TBinding, TUpdateListener } from '../../../adapter'
import { createWebcElevator } from '../../../adapter/elevator'

export function setupMenuItem(
	host: HTMLElement,
	ctrl: IMenuItem | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<IMenuItem, TMenuItemCollectionFacade> {
	const adapter = createWebcAdapterContext(host, MenuItemDescriptor(), { ctrl, props })

	const itemAdapter = createWebcAdapterContext(
		host,
		MenuCollectionItemDescriptor(),
		{ props },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, { adapter, elevator: createWebcElevator(host) })

	// Фасад первым, как у Vue: в коллекцию пункт входит, когда его контекст принят
	const item = useCollectionAdapter(itemAdapter, host, onUpdate)
	const owner = useAdapter(adapter, host, onUpdate)

	return joinBindings(owner, item)
}
