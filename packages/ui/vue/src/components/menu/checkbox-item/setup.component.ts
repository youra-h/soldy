import {
	TCollectionItemExtension,
	MenuCheckboxItemDescriptor,
	MenuCollectionCheckboxItemDescriptor,
} from '@soldy-ui/setup'
import {
	useAdapter,
	useExpose,
	VueElevatorFactory,
	useIcon,
	useSplitAttrs,
	createVueAdapterContext,
	type SetupContext,
} from '../../../adapter'
import BaseMenuCheckboxItem, { type MenuCheckboxItemProps } from './base.component'

/**
 * Два контекста, как у пункта: собственный (текст и значение флажка) и
 * коллекционный (вход в коллекцию меню и отметка — её выбор).
 *
 * `context` отдаётся в шаблон явно: нажатие — метод item-адаптера, а рефами
 * методы не пробрасываются.
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

		const itemBinding = useAdapter(itemAdapter, props, emit)
		const ownerBinding = useAdapter(adapter, props, emit)

		return {
			...itemBinding,
			...ownerBinding,
			context: itemAdapter.instance.context,
			indicatorIconTag: useIcon('check'),
			...useSplitAttrs(),
		}
	},
}
