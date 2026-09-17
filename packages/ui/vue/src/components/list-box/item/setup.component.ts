import {
	TCollectionItemExtension,
	ListBoxItemDescriptor,
	ListBoxCollectionItemDescriptor,
} from '@soldy/setup'
import { TListBoxItemCollectionFacade } from '@soldy/core'
import type { IListBoxItemProps, IListBoxItem } from '@soldy/core'
import {
	useAdapter,
	VueElevatorFactory,
	useIcon,
	useSplitAttrs,
	createVueAdapterContext,
	type SetupContext,
} from '../../../adapter'
import BaseListBoxItem, { type ListBoxItemProps } from './base.component'

export default {
	name: '_ListBoxItem',
	inheritAttrs: false,
	extends: BaseListBoxItem,
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

		const itemBinding = useAdapter<ListBoxItemProps, TListBoxItemCollectionFacade>(
			itemAdapter,
			props,
			emit,
		)
		const ownerBinding = useAdapter<IListBoxItemProps, IListBoxItem>(adapter, props, emit)

		return {
			...itemBinding,
			...ownerBinding,
			context: itemAdapter.instance.context,
			indicatorIconTag: useIcon('check'),
			...useSplitAttrs(),
		}
	},
}
