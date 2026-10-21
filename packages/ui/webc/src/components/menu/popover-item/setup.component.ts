/**
 * setupMenuPopoverItem — setup-слой пункта с панелью.
 *
 * Два контекста, как у пункта: собственный (`MenuPopoverItemDescriptor` —
 * текст, открытость, наборы панели) и фасада (`MenuCollectionItemDescriptor` —
 * вход в коллекцию меню), одной связкой. Своей коллекции у пункта с панелью
 * нет: в панели лежит что угодно.
 *
 * Логики здесь нет: стрелка к концу строки — `TMenuPopoverItemKeyboardPlugin`,
 * фокус, Escape и Tab — `TMenuPopoverItemFocusPlugin`, нажатие и уход фокуса
 * мимо — `TDismissPlugin`, координаты панели у строки — `TAnchorPlugin` её
 * Frame, одна открытая панель на меню — коллекция меню.
 */

import {
	MenuCollectionItemDescriptor,
	MenuPopoverItemDescriptor,
	TCollectionItemExtension,
	type DescriptorPluginOutputs,
} from '@soldy-ui/setup'
import type { IMenuPopoverItem, TMenuItemCollectionFacade } from '@soldy-ui/core'
import {
	createWebcAdapterContext,
	joinBindings,
	useAdapter,
	useCollectionAdapter,
} from '../../../adapter'
import type { TBinding, TUpdateListener } from '../../../adapter'
import { createWebcElevator } from '../../../adapter/elevator'

/** Выходы плагинов пункта с панелью — их читает шаблон: пометку панели владельцем. */
export type TMenuPopoverItemOutputs = DescriptorPluginOutputs<typeof MenuPopoverItemDescriptor>

export function setupMenuPopoverItem(
	host: HTMLElement,
	ctrl: IMenuPopoverItem | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<IMenuPopoverItem, TMenuItemCollectionFacade, TMenuPopoverItemOutputs> {
	const adapter = createWebcAdapterContext(host, MenuPopoverItemDescriptor(), { ctrl, props })

	const itemAdapter = createWebcAdapterContext(
		host,
		MenuCollectionItemDescriptor(),
		{ props },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, {
		item: adapter.instance,
		elevator: createWebcElevator(host),
	})

	const item = useCollectionAdapter(itemAdapter, host, onUpdate)
	// Выход `dismiss_ownerAttribute` шаблон раскладывает на панель
	const owner = useAdapter(adapter, host, onUpdate)

	return joinBindings(owner, item)
}
