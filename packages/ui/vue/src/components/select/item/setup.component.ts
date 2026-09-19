import {
	TCollectionItemExtension,
	SelectItemDescriptor,
	SelectCollectionItemDescriptor,
} from '@soldy/setup'
import {
	useAdapter,
	VueElevatorFactory,
	useIcon,
	useSplitAttrs,
	createVueAdapterContext,
	type SetupContext,
} from '../../../adapter'
import BaseSelectItem, { type SelectItemProps } from './base.component'

/**
 * Два контекста, как у элемента Tabs: собственный (текст и значение опции) и
 * коллекционный (выбранность и порядок).
 *
 * `context` отдаётся в шаблон явно: выбор — метод item-адаптера, а рефами
 * методы не пробрасываются.
 */
export default {
	name: '_SelectItem',
	inheritAttrs: false,
	extends: BaseSelectItem,
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
