import { useAdapter, VueElevator, COLLECTION_ELEVATOR } from '../../adapter'
import { CollapseDescriptor } from '@soldy/setup'
import BaseCollapse from './base.component'
import type { TBaseComponentProps } from '../../types'
import { type ICollapseProps, type ICollapse } from '@soldy/core'

export default {
	name: '_Collapse',
	extends: BaseCollapse,
	setup(props: TBaseComponentProps<ICollapseProps, ICollapse>, { emit }: any) {
		const collectionElevator = new VueElevator(COLLECTION_ELEVATOR)

		return useAdapter(CollapseDescriptor, props, emit, {
			elevators: { collection: collectionElevator },
		})
	},
}
