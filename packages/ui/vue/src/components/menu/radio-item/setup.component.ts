import {
	TCollectionItemExtension,
	TMenuRadioItemExtension,
	MenuRadioItemDescriptor,
	MenuCollectionRadioItemDescriptor,
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
import BaseMenuRadioItem, { type MenuRadioItemProps } from './base.component'

/**
 * Two contexts, as a checkbox item has: its own (the radio's text, value and
 * group) and the collection one (joining the menu's collection, and the mark —
 * its selection). The group — the nearest `Menu.RadioGroup` — the radio takes
 * by wiring at assembly (`TMenuRadioItemExtension`), before joining the
 * collection.
 *
 * `context` goes to the template explicitly: the press is a method of the
 * item adapter, and the state carries no methods.
 */
export default {
	name: '_MenuRadioItem',
	inheritAttrs: false,
	extends: BaseMenuRadioItem,
	expose: useExpose(),
	setup(props: MenuRadioItemProps, { emit }: SetupContext) {
		const adapter = createVueAdapterContext(MenuRadioItemDescriptor(), {
			ctrl: props.ctrl,
			props,
		}).use(TMenuRadioItemExtension, { elevator: VueElevatorFactory })

		const itemAdapter = createVueAdapterContext(
			MenuCollectionRadioItemDescriptor(),
			{ props },
			{ bundle: adapter.bundle },
		).use(TCollectionItemExtension, {
			item: adapter,
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
