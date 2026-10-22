/**
 * setupMenuPopoverItem — setup-слой пункта с панелью.
 *
 * Два контекста, как у пункта: собственный (`MenuPopoverItemDescriptor` —
 * текст, открытость, наборы панели) и фасада (`MenuCollectionItemDescriptor`
 * — вход в коллекцию меню). Своей коллекции у пункта с панелью нет: в панели
 * лежит что угодно, — и лифтом он ничего не опускает.
 *
 * Отдаёт разметке ещё две вещи: `context` фасада — нажатие строки — метод
 * item-адаптера `menu`, — и якорь панели — `rootElement` связки пункта,
 * геттером над руной адаптера.
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
	SvelteElevatorFactory,
	createSvelteAdapterContext,
	joinState,
	useAdapter,
	useCollectionAdapter,
	type TRootReceiver,
} from '../../../adapter'
import type { MenuPopoverItemProps } from './base.component'

export function setupMenuPopoverItem(
	getProps: () => MenuPopoverItemProps,
	mountId: string,
	receive: TRootReceiver,
) {
	const props = getProps()
	const adapter = createSvelteAdapterContext(MenuPopoverItemDescriptor(), {
		ctrl: props.ctrl,
		props,
		mountId,
	})

	// Выход `dismiss_ownerAttribute` разметка кладёт спредом на панель
	const owner = useAdapter(adapter, getProps, receive)

	const item = createSvelteAdapterContext(
		MenuCollectionItemDescriptor(),
		{ props, mountId },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, { item: adapter.instance, elevator: SvelteElevatorFactory })

	const facade = useCollectionAdapter(item, getProps, () => owner.forwardProps)

	return {
		ctrl: owner.ctrl,
		plugins: owner.plugins,
		attachElement: owner.attachElement,
		state: joinState(facade.state, owner.state),
		context: item.instance.context,

		get forwardProps() {
			return facade.forwardProps
		},

		get rootElement() {
			return owner.rootElement
		},
	}
}
