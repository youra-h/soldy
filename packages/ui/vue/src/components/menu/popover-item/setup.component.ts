import {
	TCollectionItemExtension,
	MenuCollectionItemDescriptor,
	MenuPopoverItemDescriptor,
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
import BaseMenuPopoverItem, { type MenuPopoverItemProps } from './base.component'

/**
 * Two contexts, as an item has: its own (text, openness, the panel's sets) and
 * the collection one (joining the menu's collection). An item with a panel has
 * no collection of its own: anything lies in the panel.
 *
 * `context` goes to the template explicitly: the press of the row is a method
 * of the item adapter, and the state carries no methods.
 *
 * No logic here: the arrow towards the end of the row is
 * `TMenuPopoverItemKeyboardPlugin`, focus, Escape and Tab —
 * `TMenuPopoverItemFocusPlugin`, a press and focus leaving past it —
 * `TDismissPlugin`, the panel's coordinates at the row — `TAnchorPlugin` of
 * its Frame, one open panel per menu — the menu's collection.
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
			item: adapter,
			elevator: VueElevatorFactory,
		})

		const itemBinding = useCollectionAdapter(itemAdapter, props, emit)
		// Выход `dismiss_ownerAttribute` шаблон раскладывает на панель
		const ownerBinding = useAdapter(adapter, props, emit)

		return extendBinding(joinBindings(ownerBinding, itemBinding), {
			context: itemAdapter.instance.context,
			arrowIconTag: roleIcon('arrowRight'),
			...useSplitAttrs(),
		})
	},
}
