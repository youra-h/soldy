import {
	TCollectionExtension,
	TCollectionItemExtension,
	MenuCollectionItemDescriptor,
	MenuSubmenuCollectionDescriptor,
	MenuSubmenuDescriptor,
} from '@soldy-ui/setup'
import {
	useAdapter,
	extendBinding,
	joinBindings,
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
 * Three contexts on one bundle: its own (text, openness, the panel's sets),
 * the item facade — joining the menu's collection above it — and the menu
 * facade — its own items. An item with a submenu is an item of the menu it
 * stands in and a menu of its own items: the elevator hands it the collection
 * of the menu above it, and its items — its own.
 *
 * `context` goes to the template explicitly: the press of the row is a method
 * of the item adapter, and the state carries no methods.
 *
 * No logic here: opening by keys is `TMenuSubmenuKeyboardPlugin`, by hover —
 * `TMenuHoverPlugin` of the menu above the submenu, focus, Escape and Tab —
 * `TMenuSubmenuFocusPlugin`, a press and focus leaving past it —
 * `TDismissPlugin`, the panel's coordinates at the row — `TAnchorPlugin` of
 * its Frame.
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

		const itemBinding = useCollectionAdapter(itemAdapter, props, emit)
		// Выход `dismiss_ownerAttribute` шаблон раскладывает на панель
		const ownerBinding = useAdapter(adapter, props, emit)
		const collectionBinding = useCollectionAdapter(collectionAdapter, props, emit)

		return extendBinding(joinBindings(ownerBinding, itemBinding, collectionBinding), {
			context: itemAdapter.instance.context,
			arrowIconTag: roleIcon('arrowRight'),
			...useSplitAttrs(),
		})
	},
}
