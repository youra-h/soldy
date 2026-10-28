import {
	MenuCollectionRadioItemDescriptor,
	MenuRadioItemDescriptor,
	TCollectionItemExtension,
	TMenuRadioItemExtension,
} from '@soldy-ui/setup'
import type { IMenuRadioItem, TMenuItemCollectionFacade } from '@soldy-ui/core'
import {
	createWebcAdapterContext,
	joinBindings,
	useAdapter,
	useCollectionAdapter,
} from '../../../adapter'
import type { TBinding, TUpdateListener } from '../../../adapter'
import { createWebcElevator } from '../../../adapter/elevator'

export function setupMenuRadioItem(
	host: HTMLElement,
	ctrl: IMenuRadioItem | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<IMenuRadioItem, TMenuItemCollectionFacade> {
	const elevator = createWebcElevator(host)
	// Группу — до входа в коллекцию: меню отмечает переключатель по её значению
	// уже на входе
	const adapter = createWebcAdapterContext(host, MenuRadioItemDescriptor(), {
		ctrl,
		props,
	}).use(TMenuRadioItemExtension, { elevator })

	const itemAdapter = createWebcAdapterContext(
		host,
		MenuCollectionRadioItemDescriptor(),
		{ props },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, { item: adapter.instance, member: adapter, elevator })

	// Фасад первым, как у пункта
	const item = useCollectionAdapter(itemAdapter, host, onUpdate)
	const owner = useAdapter(adapter, host, onUpdate)

	return joinBindings(owner, item)
}
