/**
 * setupMenuRadioItem — setup-слой переключателя меню.
 *
 * Два контекста, как у флажка: собственный (`MenuRadioItemDescriptor` —
 * текст, значение и группа переключателя) и фасада
 * (`MenuCollectionRadioItemDescriptor` — вход в коллекцию меню и отметка —
 * её выбор), одной связкой. Группу — ближайшую `<div is="so-menu-radio-group">`
 * выше по документу — переключатель берёт проводкой при сборке
 * (`TMenuRadioItemExtension`), до входа в коллекцию: меню отмечает его по
 * значению группы уже на входе.
 */

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
	const adapter = createWebcAdapterContext(host, MenuRadioItemDescriptor(), {
		ctrl,
		props,
	}).use(TMenuRadioItemExtension, { elevator })

	const itemAdapter = createWebcAdapterContext(
		host,
		MenuCollectionRadioItemDescriptor(),
		{ props },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, { item: adapter.instance, elevator })

	const item = useCollectionAdapter(itemAdapter, host, onUpdate)
	const owner = useAdapter(adapter, host, onUpdate)

	return joinBindings(owner, item)
}
