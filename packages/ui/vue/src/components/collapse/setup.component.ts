import { toRaw } from 'vue'
import {
	createAdapterContext,
	TCollectionExtension,
	TDragAndDropCollectionExtension,
	CollapseDescriptor,
	CollapseCollectionDescriptor,
} from '@soldy/setup'
import { TCollapseCollectionFacade } from '@soldy/core'
import { useVue, VueElevatorFactory } from '../../adapter'
import BaseCollapse from './base.component'
import type { TBaseComponentProps } from '../../types'
import { type ICollapseProps, type ICollapseComponentProps, type ICollapse } from '@soldy/core'

export default {
	name: '_Collapse',
	extends: BaseCollapse,
	setup(props: TBaseComponentProps<ICollapseProps, ICollapse>, { emit }: any) {
		const adapter = createAdapterContext(CollapseDescriptor(), {
			ctrl: toRaw(props.ctrl),
			props,
		})

		const refs = useVue<ICollapseComponentProps, ICollapse>(adapter, props, emit)

		const collectionAdapter = createAdapterContext(CollapseCollectionDescriptor(), {
			props,
			options: { owner: adapter.instance },
		})
			.use(TCollectionExtension, { elevator: VueElevatorFactory })
			.use(TDragAndDropCollectionExtension, { elevator: VueElevatorFactory })

		const refsCollection = useVue<Record<string, any>, TCollapseCollectionFacade>(
			collectionAdapter,
			props,
			emit,
		)

		return { ...refs, ...refsCollection }
	},
}
