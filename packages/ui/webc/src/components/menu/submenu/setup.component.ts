/**
 * Лифт у трёх контекстов один: фасад пункта берёт коллекцию выше хоста
 * (`up()`), фасад меню отдаёт свою хосту (`down()`) — её находят пункты в
 * панели. Связки — как у Vue: фасад пункта, свой, фасад меню.
 */

import {
	MenuCollectionItemDescriptor,
	MenuSubmenuCollectionDescriptor,
	MenuSubmenuDescriptor,
	TCollectionExtension,
	TCollectionItemExtension,
	type DescriptorPluginOutputs,
} from '@soldy-ui/setup'
import type { IMenuSubmenu, TMenuCollectionFacade, TMenuItemCollectionFacade } from '@soldy-ui/core'
import {
	createWebcAdapterContext,
	joinBindings,
	useAdapter,
	useCollectionAdapter,
} from '../../../adapter'
import type { TBinding, TUpdateListener } from '../../../adapter'
import { createWebcElevator } from '../../../adapter/elevator'

/** Выходы плагинов подменю — шаблон читает из них пометку панели владельцем. */
export type TMenuSubmenuOutputs = DescriptorPluginOutputs<typeof MenuSubmenuDescriptor>

export function setupMenuSubmenu(
	host: HTMLElement,
	ctrl: IMenuSubmenu | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<IMenuSubmenu, TMenuItemCollectionFacade, TMenuSubmenuOutputs, TMenuCollectionFacade> {
	const elevator = createWebcElevator(host)
	const adapter = createWebcAdapterContext(host, MenuSubmenuDescriptor(), { ctrl, props })

	// В меню над ним — пункт
	const itemAdapter = createWebcAdapterContext(
		host,
		MenuCollectionItemDescriptor(),
		{ props },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, { item: adapter.instance, elevator })

	// Для своих пунктов — меню
	const collectionAdapter = createWebcAdapterContext(
		host,
		MenuSubmenuCollectionDescriptor(),
		{ props, options: { owner: adapter.instance, engine: props['engine'] } },
		{ bundle: adapter.bundle },
	).use(TCollectionExtension, { elevator })

	const item = useCollectionAdapter(itemAdapter, host, onUpdate)
	const owner = useAdapter(adapter, host, onUpdate)
	const menu = useCollectionAdapter(collectionAdapter, host, onUpdate)

	return joinBindings(owner, item, menu)
}
