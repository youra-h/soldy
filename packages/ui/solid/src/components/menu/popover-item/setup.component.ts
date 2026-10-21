/**
 * setupMenuPopoverItem — setup-слой пункта с панелью.
 *
 * Два контекста, как у пункта: собственный (`MenuPopoverItemDescriptor` —
 * текст, открытость, наборы панели) и фасада (`MenuCollectionItemDescriptor`
 * — вход в коллекцию меню). Своей коллекции у пункта с панелью нет: в панели
 * лежит что угодно, — и слоя лифта он не заводит.
 *
 * `context` отдаётся разметке явно: нажатие строки — метод item-адаптера
 * `menu`.
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
} from '@soldy-ui/setup'
import {
	createSolidAdapterContext,
	joinState,
	useAdapter,
	useCollectionAdapter,
	useElevator,
} from '../../../adapter'
import type { MenuPopoverItemProps } from './base.component'

export function setupMenuPopoverItem(props: MenuPopoverItemProps) {
	const { elevator } = useElevator()
	const adapter = createSolidAdapterContext(MenuPopoverItemDescriptor(), {
		ctrl: props.ctrl,
		props,
	})
	// Выход `dismiss_ownerAttribute` разметка раскладывает на панель
	const owner = useAdapter(adapter, props)

	const item = createSolidAdapterContext(
		MenuCollectionItemDescriptor(),
		{ props },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, { item: adapter.instance, elevator })

	const facade = useCollectionAdapter(item, props, owner.forwardProps)

	return {
		ctrl: owner.ctrl,
		plugins: owner.plugins,
		ref: owner.ref,
		rootElement: owner.rootElement,
		state: joinState(facade.state, owner.state),
		context: item.instance.context,
		forwardProps: facade.forwardProps,
	}
}
