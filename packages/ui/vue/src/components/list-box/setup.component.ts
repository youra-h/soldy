import { useAdapter, VueElevator, COLLECTION_ELEVATOR } from '../../adapter'
import { ListBoxDescriptor } from '@soldy/setup'
import BaseListBox from './base.component'
import type { TBaseComponentProps } from '../../types'
import { type IListBoxProps, type IListBox } from '@soldy/core'

export default {
	name: '_ListBox',
	extends: BaseListBox,
	setup(props: TBaseComponentProps<IListBoxProps, IListBox>, { emit }: any) {
		const collectionElevator = new VueElevator(COLLECTION_ELEVATOR)

		return useAdapter(ListBoxDescriptor, props, emit, {
			elevators: { collection: collectionElevator },
		})
	},
}
