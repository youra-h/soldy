/**
 * setupMenuSubmenu — setup-слой пункта с подменю.
 *
 * Три контекста на одном наборе, как у Vue: собственный
 * (`MenuSubmenuDescriptor` — текст, открытость, наборы панели), фасад пункта
 * (`MenuCollectionItemDescriptor` — вход в коллекцию меню над ним) и фасад
 * меню (`MenuSubmenuCollectionDescriptor` — свои пункты). Пункт с подменю —
 * пункт меню, в котором стоит, и меню своих пунктов.
 *
 * Лифт у трёх один (`useElevator`), и коллекции у пункта и его пунктов разные
 * по построению: фасад пункта читает слой предка (`up()`) — коллекцию меню
 * над подменю, — а фасад меню пишет свой (`down()`), и детям его отдаёт
 * `Elevate` вокруг панели. Порядок, в котором сборка зовёт лифт, не важен.
 *
 * Готовая коллекция снаружи — как у меню: дали `engine` (подменю из данных
 * отдаёт свой движок пропсом) — фасад работает на нём, не дали — соберёт
 * свою. Состояние у контекстов своё, а разметка читает его одним видом
 * (`joinState`); атрибуты корня — то, что не съел ни один из трёх.
 *
 * `context` отдаётся разметке явно: нажатие строки — метод item-адаптера
 * `menu`.
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
} from '@soldy-ui/setup'
import {
	createSolidAdapterContext,
	joinState,
	useAdapter,
	useCollectionAdapter,
	useElevator,
} from '../../../adapter'
import type { MenuSubmenuProps } from './base.component'

export function setupMenuSubmenu(props: MenuSubmenuProps) {
	const { elevator, layer } = useElevator()
	const adapter = createSolidAdapterContext(MenuSubmenuDescriptor(), {
		ctrl: props.ctrl,
		props,
	})
	// Выход `dismiss_ownerAttribute` разметка раскладывает на панель
	const owner = useAdapter(adapter, props)

	// В меню над ним — пункт
	const item = createSolidAdapterContext(
		MenuCollectionItemDescriptor(),
		{ props },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, { item: adapter.instance, elevator })

	const facade = useCollectionAdapter(item, props, owner.forwardProps)

	// Для своих пунктов — меню
	const collectionAdapter = createSolidAdapterContext(
		MenuSubmenuCollectionDescriptor(),
		{ props, options: { owner: adapter.instance, engine: props.engine } },
		{ bundle: adapter.bundle },
	).use(TCollectionExtension, { elevator })

	const collectionBinding = useCollectionAdapter(collectionAdapter, props, facade.forwardProps)

	return {
		ctrl: owner.ctrl,
		plugins: owner.plugins,
		ref: owner.ref,
		rootElement: owner.rootElement,
		state: joinState(joinState(facade.state, owner.state), collectionBinding.state),
		context: item.instance.context,
		forwardProps: collectionBinding.forwardProps,
		layer,
	}
}
