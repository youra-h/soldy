import { toRaw } from 'vue'
import {
	createAdapterContext,
	TCollectionItemExtension,
	ListBoxItemDescriptor,
	ListBoxCollectionItemDescriptor,
} from '@soldy/setup'
import { TListBoxItemCollectionFacade } from '@soldy/core'
import type { IListBoxItemProps, IListBoxItem } from '@soldy/core'
import { useVue, VueElevatorFactory } from '../../../adapter'
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
		})

		const itemAdapter = createAdapterContext(
			ListBoxCollectionItemDescriptor(),
			{ props },
			{ bundle: adapter.bundle, defaultExtensions: [] },
		).use(TCollectionItemExtension, {
			item: adapter.instance,
			elevator: VueElevatorFactory,
		})

		const itemBinding = useVue<Record<string, any>, TListBoxItemCollectionFacade>(
			itemAdapter,
			props,
			emit,
		)
		const ownerBinding = useVue<IListBoxItemProps, IListBoxItem>(adapter, props, emit)

		return {
			...itemBinding,
			...ownerBinding,
			context: itemAdapter.instance.context,
			...useSplitAttrs(),
		}
	},
}
