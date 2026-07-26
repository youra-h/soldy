import { toRaw } from 'vue'
import { createAdapterContext, withCollectionItem, ListBoxItemDescriptor } from '@soldy/setup'
import { useVue, vueElevatorFactory } from '../../../adapter'
import { useSplitAttrs } from '../../../composables/useSplitAttrs'
import BaseListBoxItem from './list-box-item.component'
import type { TBaseComponentProps } from '../../../types'
import { type IListItemProps, type IListBoxItem } from '@soldy/core'

export default {
	name: '_ListBoxItem',
	inheritAttrs: false,
	extends: BaseListBoxItem,
	setup(props: TBaseComponentProps<IListItemProps, IListBoxItem>, { emit }: any) {
		const adapter = createAdapterContext(ListBoxItemDescriptor, {
			ctrl: props.ctrl ? toRaw(props.ctrl) : undefined,
			plugins: props.plugins,
			props,
		}).use(withCollectionItem(vueElevatorFactory))

		return {
			...useVue(adapter, props, emit),
			...useSplitAttrs(),
		}
	},
}
