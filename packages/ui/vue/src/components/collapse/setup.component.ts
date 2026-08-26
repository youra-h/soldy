import { toRaw } from 'vue'
import {
	createAdapterContext,
	TCollectionExtension,
	TDragAndDropCollectionExtension,
	CollapseDescriptor,
} from '@soldy/setup'
import { useVue, VueElevatorFactory } from '../../adapter'
import BaseCollapse from './base.component'
import type { TBaseComponentProps } from '../../types'
import { type ICollapseProps, type ICollapse } from '@soldy/core'

export default {
	name: '_Collapse',
	extends: BaseCollapse,
	setup(props: TBaseComponentProps<ICollapseProps, ICollapse>, { emit }: any) {
		const adapter = createAdapterContext(CollapseDescriptor, {
			ctrl: toRaw(props.ctrl),
			props,
		})
			.use(TCollectionExtension, { elevator: VueElevatorFactory })
			.use(TDragAndDropCollectionExtension, { elevator: VueElevatorFactory })

		return useVue<ICollapseProps, ICollapse>(adapter, props, emit)
	},
}
