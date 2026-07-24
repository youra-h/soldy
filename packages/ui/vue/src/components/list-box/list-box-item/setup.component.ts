import { useAdapter, VueElevator, COLLECTION_ELEVATOR } from '../../../adapter'
import { ListBoxItemDescriptor } from '@soldy/setup'
import BaseListBoxItem from './list-box-item.component'
import { useSplitAttrs } from '../../../composables/useSplitAttrs'
import type { TBaseComponentProps } from '../../../types'
import { type IListItemProps, type IListBoxItem } from '@soldy/core'

export default {
	name: '_ListBoxItem',
	inheritAttrs: false,
	extends: BaseListBoxItem,
	setup(props: TBaseComponentProps<IListItemProps, IListBoxItem>, { emit }: any) {
		const collectionElevator = new VueElevator(COLLECTION_ELEVATOR)

		return {
			...useAdapter(ListBoxItemDescriptor, props, emit, {
				elevators: { collection: collectionElevator },
			}),
			...useSplitAttrs(),
		}
	},
}
