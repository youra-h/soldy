import { toRaw } from 'vue'
import {
	createAdapterContext,
	TCollectionItemExtension,
	ListBoxItemDescriptor,
	ListBoxCollectionItemDescriptor,
} from '@soldy/setup'
import { TListBoxItemCollectionFacade } from '@soldy/core'
import type { IListBoxItemProps, IListBoxItem } from '@soldy/core'
import { useAdapter, VueElevatorFactory } from '../../../adapter'
import { useSplitAttrs } from '../../../composables'
import BaseListBoxItem, { type ListBoxItemProps } from './base.component'

export default {
	name: '_ListBoxItem',
	inheritAttrs: false,
	extends: BaseListBoxItem,
	setup(props: ListBoxItemProps, { emit }: any) {
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

		const itemBinding = useAdapter<Record<string, any>, TListBoxItemCollectionFacade>(
			itemAdapter,
			props,
			emit,
		)
		const ownerBinding = useAdapter<IListBoxItemProps, IListBoxItem>(adapter, props, emit)

		return {
			...itemBinding,
			...ownerBinding,
			context: itemAdapter.instance.context,
			...useSplitAttrs(),
		}
	},
}
