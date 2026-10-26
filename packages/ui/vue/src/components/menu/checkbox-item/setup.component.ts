import {
	TCollectionItemExtension,
	MenuCheckboxItemDescriptor,
	MenuCollectionCheckboxItemDescriptor,
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
import BaseMenuCheckboxItem, { type MenuCheckboxItemProps } from './base.component'

/**
 * Two contexts, as an item has: its own (the checkbox's text and value) and
 * the collection one (joining the menu's collection, and the mark — its
 * selection).
 *
 * `context` goes to the template explicitly: the press is a method of the
 * item adapter, and the state carries no methods.
 */
export default {
	name: '_MenuCheckboxItem',
	inheritAttrs: false,
	extends: BaseMenuCheckboxItem,
	expose: useExpose(),
	setup(props: MenuCheckboxItemProps, { emit }: SetupContext) {
		const adapter = createVueAdapterContext(MenuCheckboxItemDescriptor(), {
			ctrl: props.ctrl,
			props,
		})

		const itemAdapter = createVueAdapterContext(
			MenuCollectionCheckboxItemDescriptor(),
			{ props },
			{ bundle: adapter.bundle },
		).use(TCollectionItemExtension, {
			item: adapter.instance,
			elevator: VueElevatorFactory,
		})

		const itemBinding = useCollectionAdapter(itemAdapter, props, emit)
		const ownerBinding = useAdapter(adapter, props, emit)

		return extendBinding(joinBindings(ownerBinding, itemBinding), {
			context: itemAdapter.instance.context,
			indicatorIconTag: roleIcon('check'),
			...useSplitAttrs(),
		})
	},
}
