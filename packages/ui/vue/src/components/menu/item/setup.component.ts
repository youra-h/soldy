import {
	TCollectionItemExtension,
	MenuItemDescriptor,
	MenuCollectionItemDescriptor,
} from '@soldy-ui/setup'
import {
	useAdapter,
	extendBinding,
	joinBindings,
	useCollectionAdapter,
	useExpose,
	VueElevatorFactory,
	useSplitAttrs,
	createVueAdapterContext,
	type SetupContext,
} from '../../../adapter'
import BaseMenuItem, { type MenuItemProps } from './base.component'

/**
 * Two contexts, as a ListBox item has: its own (the item's text and value) and
 * the collection one (joining the menu's collection).
 *
 * `context` goes to the template explicitly: the press is a method of the
 * item adapter, and the state carries no methods.
 */
export default {
	name: '_MenuItem',
	inheritAttrs: false,
	extends: BaseMenuItem,
	expose: useExpose(),
	setup(props: MenuItemProps, { emit }: SetupContext) {
		const adapter = createVueAdapterContext(MenuItemDescriptor(), {
			ctrl: props.ctrl,
			props,
		})

		const itemAdapter = createVueAdapterContext(
			MenuCollectionItemDescriptor(),
			{ props },
			{ bundle: adapter.bundle },
		).use(TCollectionItemExtension, {
			item: adapter.instance,
			member: adapter,
			elevator: VueElevatorFactory,
		})

		const itemBinding = useCollectionAdapter(itemAdapter, props, emit)
		const ownerBinding = useAdapter(adapter, props, emit)

		return extendBinding(joinBindings(ownerBinding, itemBinding), {
			context: itemAdapter.instance.context,
			...useSplitAttrs(),
		})
	},
}
