/**
 * useSetupMenuSubmenu — setup-слой пункта с подменю (аналог setup.component.ts во Vue).
 *
 * Три контекста одной сборкой на одном наборе, как у Vue: собственный
 * (`MenuSubmenuDescriptor` — текст, открытость, наборы панели), фасад пункта
 * (`MenuCollectionItemDescriptor` — вход в коллекцию меню над ним) и фасад
 * меню (`MenuSubmenuCollectionDescriptor` — свои пункты). Пункт с подменю —
 * пункт меню, в котором стоит, и меню своих пунктов.
 *
 * Лифт у трёх один — лифт сборки, — и коллекции у пункта и его пунктов
 * разные по построению: фасад пункта читает `up()` из слоя, который подменю
 * увидело на рендере, — коллекцию меню над ним, — а фасад меню пишет `down()`
 * в свой слой, и детям его отдаёт `Elevate` вокруг панели. Порядок, в котором
 * сборка зовёт лифт, не важен.
 *
 * Готовая коллекция снаружи — как у меню: дали `engine` (подменю из данных
 * отдаёт свой движок пропсом) — фасад работает на нём, не дали — соберёт
 * свою. Состояние трёх контекстов разметка читает одним видом; атрибуты
 * корня — то, что не съел ни один из трёх. Корень служит панели якорем, и
 * значением рендера его отдаёт хук адаптера `useRootElement`.
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
	useAdapter,
	useAdapterContext,
	useCollectionAdapter,
	useRootElement,
} from '../../../adapter'
import type { MenuSubmenuProps } from './base.component'

export function useSetupMenuSubmenu(props: MenuSubmenuProps) {
	const {
		contexts: [adapter, item, collectionAdapter],
		layer,
	} = useAdapterContext((create, elevator) => {
		const adapter = create(MenuSubmenuDescriptor(), { ctrl: props.ctrl, props })

		// В меню над ним — пункт
		const item = create(
			MenuCollectionItemDescriptor(),
			{ props },
			{ bundle: adapter.bundle },
		).use(TCollectionItemExtension, { item: adapter.instance, elevator })

		// Для своих пунктов — меню. Готовая коллекция снаружи — как у меню:
		// дали — фасад работает на ней, не дали — соберёт свою
		const collectionAdapter = create(
			MenuSubmenuCollectionDescriptor(),
			{ props, options: { owner: adapter.instance, engine: props.engine } },
			{ bundle: adapter.bundle },
		).use(TCollectionExtension, { elevator })

		return [adapter, item, collectionAdapter] as const
	})

	// Выход `dismiss_ownerAttribute` разметка раскладывает на панель
	const owner = useAdapter(adapter, props)
	const facade = useCollectionAdapter(item, props, owner.forwardProps)
	const collectionBinding = useCollectionAdapter(collectionAdapter, props, facade.forwardProps)

	return {
		...owner,
		forwardProps: collectionBinding.forwardProps,
		state: { ...facade.state, ...owner.state, ...collectionBinding.state },
		context: item.instance.context,
		rootElement: useRootElement(owner.root),
		layer,
	}
}
