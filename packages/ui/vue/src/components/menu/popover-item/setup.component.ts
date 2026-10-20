import {
	TCollectionItemExtension,
	MenuCollectionItemDescriptor,
	MenuPopoverItemDescriptor,
} from '@soldy-ui/setup'
import {
	useAdapter,
	useExpose,
	VueElevatorFactory,
	roleIcon,
	useSplitAttrs,
	createVueAdapterContext,
	type SetupContext,
} from '../../../adapter'
import BaseMenuPopoverItem, { type MenuPopoverItemProps } from './base.component'

/**
 * Два контекста, как у пункта: собственный (текст, открытость, наборы
 * панели) и коллекционный (вход в коллекцию меню). Своей коллекции у пункта с
 * панелью нет: в панели лежит что угодно.
 *
 * `context` отдаётся в шаблон явно: нажатие строки — метод item-адаптера, а
 * рефами методы не пробрасываются.
 *
 * Логики здесь нет: стрелка к концу строки — `TMenuPopoverItemKeyboardPlugin`,
 * фокус, Escape и Tab — `TMenuPopoverItemFocusPlugin`, нажатие и уход фокуса
 * мимо — `TDismissPlugin`, координаты панели у строки — `TAnchorPlugin` её
 * Frame, одна открытая панель на меню — коллекция меню.
 */
export default {
	name: '_MenuPopoverItem',
	inheritAttrs: false,
	extends: BaseMenuPopoverItem,
	expose: useExpose(),
	setup(props: MenuPopoverItemProps, { emit }: SetupContext) {
		const adapter = createVueAdapterContext(MenuPopoverItemDescriptor(), {
			ctrl: props.ctrl,
			props,
		})

		const itemAdapter = createVueAdapterContext(
			MenuCollectionItemDescriptor(),
			{ props },
			{ bundle: adapter.bundle },
		).use(TCollectionItemExtension, {
			item: adapter.instance,
			elevator: VueElevatorFactory,
		})

		const itemBinding = useAdapter(itemAdapter, props, emit)
		// Выход `dismiss_ownerAttribute` шаблон раскладывает на панель
		const ownerBinding = useAdapter(adapter, props, emit)

		return {
			...itemBinding,
			...ownerBinding,
			context: itemAdapter.instance.context,
			arrowIconTag: roleIcon('arrowRight'),
			...useSplitAttrs(),
		}
	},
}
