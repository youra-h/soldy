import { toRaw } from 'vue'
import {
	createAdapterContext,
	TCollectionItemExtension,
	ListBoxItemDescriptor,
	ListBoxCollectionDescriptor,
} from '@soldy/setup'
import type {
	IListBoxItemProps,
	IListBoxItem,
	TListBoxCollectionExtensions,
} from '@soldy/core'
import { useVue, useVueCollectionItem, VueElevatorFactory } from '../../../adapter'
import { useSplitAttrs } from '../../../composables'
import BaseListBoxItem from './base.component'
import type { TBaseComponentProps } from '../../../types'

export default {
	name: '_ListBoxItem',
	inheritAttrs: false,
	extends: BaseListBoxItem,
	setup(props: TBaseComponentProps<IListBoxItemProps, IListBoxItem>, { emit }: any) {
		const adapter = createAdapterContext(ListBoxItemDescriptor(), {
			ctrl: toRaw(props.ctrl),
			props,
		}).use(TCollectionItemExtension, {
			descriptor: ListBoxCollectionDescriptor(),
			elevator: VueElevatorFactory,
		})

		const { context, ...itemRefs } = useVueCollectionItem<
			IListBoxItem,
			TListBoxCollectionExtensions
		>(adapter, props)

		return {
			...useVue<IListBoxItemProps, IListBoxItem>(adapter, props, emit),
			...itemRefs,
			context,
			...useSplitAttrs(),
		}
	},
}
