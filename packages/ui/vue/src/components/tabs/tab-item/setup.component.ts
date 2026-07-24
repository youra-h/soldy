import { useAdapter, VueElevator, COLLECTION_ELEVATOR } from '../../../adapter'
import { TabItemDescriptor } from '@soldy/setup'
import BaseTabItem from './tab-item.component'
import { useIconImport, useSplitAttrs } from '../../../composables'
import type { TBaseComponentProps } from '../../../types'
import { type ITabItemProps, type ITabItem } from '@soldy/core'

export default {
	name: '_TabItem',
	inheritAttrs: false,
	extends: BaseTabItem,
	setup(props: TBaseComponentProps<ITabItemProps, ITabItem>, { emit }: any) {
		const collectionElevator = new VueElevator(COLLECTION_ELEVATOR)

		return {
			...useAdapter(TabItemDescriptor, props, emit, {
				elevators: { collection: collectionElevator },
			}),
			closeIconTag: useIconImport('close'),
			...useSplitAttrs(),
		}
	},
}
