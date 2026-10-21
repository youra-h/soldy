/**
 * useSetupMenuPopoverItem — setup-слой пункта с панелью (аналог setup.component.ts во Vue).
 *
 * Два контекста одной сборкой, как у пункта: собственный
 * (`MenuPopoverItemDescriptor` — текст, открытость, наборы панели) и фасада
 * (`MenuCollectionItemDescriptor` — вход в коллекцию меню). Своей коллекции у
 * пункта с панелью нет: в панели лежит что угодно, — и слоя лифта он детям не
 * отдаёт.
 *
 * Корень служит панели якорем, а разметке он нужен значением рендера: его
 * отдаёт хук адаптера `useRootElement`, как у Popover.
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
	useAdapter,
	useAdapterContext,
	useCollectionAdapter,
	useRootElement,
} from '../../../adapter'
import type { MenuPopoverItemProps } from './base.component'

export function useSetupMenuPopoverItem(props: MenuPopoverItemProps) {
	const {
		contexts: [adapter, item],
	} = useAdapterContext((create, elevator) => {
		const adapter = create(MenuPopoverItemDescriptor(), { ctrl: props.ctrl, props })

		const item = create(
			MenuCollectionItemDescriptor(),
			{ props },
			{ bundle: adapter.bundle },
		).use(TCollectionItemExtension, { item: adapter.instance, elevator })

		return [adapter, item] as const
	})

	// Выход `dismiss_ownerAttribute` разметка раскладывает на панель
	const owner = useAdapter(adapter, props)
	const facade = useCollectionAdapter(item, props, owner.forwardProps)

	return {
		...owner,
		forwardProps: facade.forwardProps,
		state: { ...facade.state, ...owner.state },
		context: item.instance.context,
		rootElement: useRootElement(owner.root),
	}
}
