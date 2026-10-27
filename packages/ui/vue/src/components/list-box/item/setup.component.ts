import {
	TCollectionItemExtension,
	ListBoxItemDescriptor,
	ListBoxCollectionItemDescriptor,
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
import BaseListBoxItem, { type ListBoxItemProps } from './base.component'

export default {
	name: '_ListBoxItem',
	inheritAttrs: false,
	extends: BaseListBoxItem,
	expose: useExpose(),
	setup(props: ListBoxItemProps, { emit }: SetupContext) {
		const adapter = createVueAdapterContext(ListBoxItemDescriptor(), {
			ctrl: props.ctrl,
			props,
		})

		const itemAdapter = createVueAdapterContext(
			ListBoxCollectionItemDescriptor(),
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
			indicatorIconTag: roleIcon('check'),
			...useSplitAttrs(),
		})
	},
}
