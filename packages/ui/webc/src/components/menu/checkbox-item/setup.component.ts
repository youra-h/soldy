/**
 * setupMenuCheckboxItem — setup-слой флажка меню.
 *
 * Два контекста, как у пункта: собственный (`MenuCheckboxItemDescriptor` —
 * текст и значение флажка) и фасада (`MenuCollectionCheckboxItemDescriptor` —
 * вход в коллекцию меню и отметка: `selected` — выбор коллекции), одной
 * связкой. Порядок связок — как у пункта: фасад первым.
 */

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
		elevator: createWebcElevator(host),
	})

	const item = useCollectionAdapter(itemAdapter, host, onUpdate)
	const owner = useAdapter(adapter, host, onUpdate)

	return joinBindings(owner, item)
}
