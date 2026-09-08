import { toRaw } from 'vue'
import {
	createAdapterContext,
	TCollectionItemExtension,
	SelectItemDescriptor,
	SelectCollectionItemDescriptor,
} from '@soldy/setup'
import type { ISelectItemProps, ISelectItem, TSelectItemCollectionFacade } from '@soldy/core'
import { useAdapter, VueElevatorFactory, useSplitAttrs } from '../../../adapter'
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
	setup(props: SelectItemProps, { emit }: any) {
		const adapter = createAdapterContext(SelectItemDescriptor(), {
			ctrl: toRaw(props.ctrl),
			props,
		})

		const itemAdapter = createAdapterContext(
			SelectCollectionItemDescriptor(),
			{ props },
			{ bundle: adapter.bundle, defaultExtensions: [] },
		).use(TCollectionItemExtension, {
			item: adapter.instance,
			elevator: VueElevatorFactory,
		})

		const itemBinding = useAdapter<Record<string, any>, TSelectItemCollectionFacade>(
			itemAdapter,
			props,
			emit,
		)
		const ownerBinding = useAdapter<ISelectItemProps, ISelectItem>(adapter, props, emit)

		return {
			...itemBinding,
			...ownerBinding,
			context: itemAdapter.instance.context,
			...useSplitAttrs(),
		}
	},
}
