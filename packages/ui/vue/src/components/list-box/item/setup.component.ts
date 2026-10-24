import {
	TCollectionItemExtension,
	ListBoxItemDescriptor,
	ListBoxCollectionItemDescriptor,
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
			item: adapter.instance,
			elevator: VueElevatorFactory,
		})

		const itemBinding = useAdapter(itemAdapter, props, emit)
		const ownerBinding = useAdapter(adapter, props, emit)

		return {
			...itemBinding,
			...ownerBinding,
			context: itemAdapter.instance.context,
			/**
			 * Строка — экземпляр `TItemRow`, которым владеет элемент. Не проп (не
			 * меняется за время жизни элемента), поэтому отдаём инстансом —
			 * `<Button :ctrl="row">` берёт его целиком, как поле Select.
			 */
			row: adapter.instance.row,
			indicatorIconTag: roleIcon('check'),
			...useSplitAttrs(),
		}
	},
}
