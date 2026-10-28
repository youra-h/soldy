import {
	TCollectionItemExtension,
	RadioGroupItemDescriptor,
	RadioGroupCollectionItemDescriptor,
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
import BaseRadioGroupItem, { type RadioGroupItemProps } from './base.component'

/**
 * Два контекста, как у элементов остальных коллекций: собственный (props
 * радио) и фасада (отмечено ли радио в группе).
 */
export default {
	name: '_RadioGroupItem',
	inheritAttrs: false,
	extends: BaseRadioGroupItem,
	expose: useExpose(),
	setup(props: RadioGroupItemProps, { emit }: SetupContext) {
		const adapter = createVueAdapterContext(RadioGroupItemDescriptor(), {
			ctrl: props.ctrl,
			props,
		})

		const itemAdapter = createVueAdapterContext(
			RadioGroupCollectionItemDescriptor(),
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
