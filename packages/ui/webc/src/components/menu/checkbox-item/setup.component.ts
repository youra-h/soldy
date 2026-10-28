import {
	MenuCheckboxItemDescriptor,
	MenuCollectionCheckboxItemDescriptor,
	TCollectionItemExtension,
} from '@soldy-ui/setup'
import type { IMenuCheckboxItem, TMenuItemCollectionFacade } from '@soldy-ui/core'
import {
	createWebcAdapterContext,
	joinBindings,
	useAdapter,
	useCollectionAdapter,
} from '../../../adapter'
import type { TBinding, TUpdateListener } from '../../../adapter'
import { createWebcElevator } from '../../../adapter/elevator'

export function setupMenuCheckboxItem(
	host: HTMLElement,
	ctrl: IMenuCheckboxItem | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<IMenuCheckboxItem, TMenuItemCollectionFacade> {
	const adapter = createWebcAdapterContext(host, MenuCheckboxItemDescriptor(), { ctrl, props })

	const itemAdapter = createWebcAdapterContext(
		host,
		MenuCollectionCheckboxItemDescriptor(),
		{ props },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, {
		item: adapter.instance,
		member: adapter,
		elevator: createWebcElevator(host),
	})

	// Фасад первым, как у пункта
	const item = useCollectionAdapter(itemAdapter, host, onUpdate)
	const owner = useAdapter(adapter, host, onUpdate)

	return joinBindings(owner, item)
}
