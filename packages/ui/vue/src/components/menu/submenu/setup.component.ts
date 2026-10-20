import {
	TCollectionExtension,
	TCollectionItemExtension,
	MenuCollectionItemDescriptor,
	MenuSubmenuCollectionDescriptor,
	MenuSubmenuDescriptor,
} from '@soldy-ui/setup'
import {
	useAdapter,
	useCollectionAdapter,
	useExpose,
	VueElevatorFactory,
	roleIcon,
	useSplitAttrs,
	createVueAdapterContext,
	type SetupContext,
} from '../../../adapter'
import BaseMenuSubmenu, { type MenuSubmenuProps } from './base.component'

/**
 * Три контекста на одном наборе: собственный (текст, открытость, наборы
 * панели), фасад пункта — вход в коллекцию меню над ним — и фасад меню —
 * свои пункты. Пункт с подменю — пункт меню, в котором стоит, и меню своих
 * пунктов: лифт отдаёт ему коллекцию меню над ним, а его пунктам — его
 * собственную.
 *
 * `context` отдаётся в шаблон явно: нажатие строки — метод item-адаптера, а
 * рефами методы не пробрасываются.
 *
 * Логики здесь нет: открытие клавишами — `TMenuSubmenuKeyboardPlugin`,
 * наведением — `TMenuHoverPlugin` меню над подменю, фокус, Escape и Tab —
 * `TMenuSubmenuFocusPlugin`, нажатие и уход фокуса мимо — `TDismissPlugin`,
 * координаты панели у строки — `TAnchorPlugin` её Frame.
 */
export default {
	name: '_MenuSubmenu',
	inheritAttrs: false,
	extends: BaseMenuSubmenu,
	expose: useExpose(),
	setup(props: MenuSubmenuProps, { emit }: SetupContext) {
		const adapter = createVueAdapterContext(MenuSubmenuDescriptor(), {
			ctrl: props.ctrl,
			props,
		})

		// В меню над ним — пункт
		const itemAdapter = createVueAdapterContext(
			MenuCollectionItemDescriptor(),
			{ props },
			{ bundle: adapter.bundle },
		).use(TCollectionItemExtension, {
			item: adapter.instance,
			elevator: VueElevatorFactory,
		})

		// Для своих пунктов — меню. Готовая коллекция снаружи — как у меню:
		// дали — фасад работает на ней, не дали — соберёт свою
		const collectionAdapter = createVueAdapterContext(
			MenuSubmenuCollectionDescriptor(),
			{
				props,
				options: { owner: adapter.instance, engine: props.engine },
			},
			{ bundle: adapter.bundle },
		).use(TCollectionExtension, { elevator: VueElevatorFactory })

		const itemBinding = useAdapter(itemAdapter, props, emit)
		// Выход `dismiss_ownerAttribute` шаблон раскладывает на панель
		const ownerBinding = useAdapter(adapter, props, emit)
		const collectionBinding = useCollectionAdapter(collectionAdapter, props, emit)

		return {
			...itemBinding,
			...ownerBinding,
			...collectionBinding,
			context: itemAdapter.instance.context,
			arrowIconTag: roleIcon('arrowRight'),
			...useSplitAttrs(),
		}
	},
}
