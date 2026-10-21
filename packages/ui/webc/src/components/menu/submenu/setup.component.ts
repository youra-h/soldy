/**
 * setupMenuSubmenu — setup-слой пункта с подменю.
 *
 * Три контекста на одном наборе, как у Vue и Solid: собственный
 * (`MenuSubmenuDescriptor` — текст, открытость, наборы панели), фасад пункта
 * (`MenuCollectionItemDescriptor` — вход в коллекцию меню над ним) и фасад меню
 * (`MenuSubmenuCollectionDescriptor` — свои пункты). Пункт с подменю — пункт
 * меню, в котором стоит, и меню своих пунктов. Одной связкой их сводит
 * `joinBindings` третьим параметром: состояние — одним видом, входы и события
 * — всех трёх, а фасад, через контекст которого шаблон зовёт нажатие строки, —
 * фасад пункта.
 *
 * Лифт у трёх один — фабрика на хост (`createWebcElevator`), и коллекции у
 * пункта и его пунктов разные по построению: фасад пункта берёт ближайшую выше
 * хоста (`up()`, сам хост не в счёт) — коллекцию меню над подменю, — а фасад
 * меню отдаёт свою хосту (`down()`), и её находят пункты в панели: поиск вверх
 * от увезённой панели идёт к её якорю, в корень подменю. Порядок, в котором
 * сборка зовёт лифт, не важен.
 *
 * Готовая коллекция снаружи — как у меню: дали `engine` (подменю из данных
 * получает свой движок свойством от меню над ним) — фасад работает на нём, не
 * дали — соберёт свою (`completeEngine`). Порядок связок — как у Vue: фасад
 * пункта, свой, фасад меню.
 *
 * Логики здесь нет: открытие клавишами — `TMenuSubmenuKeyboardPlugin`,
 * наведением — `TMenuHoverPlugin` меню над подменю, фокус, Escape и Tab —
 * `TMenuSubmenuFocusPlugin`, нажатие и уход фокуса мимо — `TDismissPlugin`,
 * координаты панели у строки — `TAnchorPlugin` её Frame.
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

/** Выходы плагинов подменю — их читает шаблон: пометку панели владельцем. */
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
	// Выход `dismiss_ownerAttribute` шаблон раскладывает на панель
	const owner = useAdapter(adapter, host, onUpdate)
	const menu = useCollectionAdapter(collectionAdapter, host, onUpdate)

	return joinBindings(owner, item, menu)
}
