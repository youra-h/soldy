import {
	TCollectionItemExtension,
	SelectItemDescriptor,
	SelectCollectionItemDescriptor,
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
import BaseSelectItem, { type SelectItemProps } from './base.component'

/**
 * Two contexts, as a Tabs item has: its own (the option's text and value) and
 * the collection one (selection and order).
 *
 * `context` goes to the template explicitly: choosing is a method of the
 * item adapter, and the state carries no methods.
 */
export default {
	name: '_SelectItem',
	inheritAttrs: false,
	extends: BaseSelectItem,
	expose: useExpose(),
	setup(props: SelectItemProps, { emit }: SetupContext) {
		const adapter = createVueAdapterContext(SelectItemDescriptor(), {
			ctrl: props.ctrl,
			props,
		})

		const itemAdapter = createVueAdapterContext(
			SelectCollectionItemDescriptor(),
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
			indicatorIconTag: roleIcon('check'),
			...useSplitAttrs(),
		})
	},
}
