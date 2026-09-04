import { toRaw } from 'vue'
import {
	createAdapterContext,
	TCollectionExtension,
	TDragAndDropCollectionExtension,
	CollapseDescriptor,
	CollapseCollectionDescriptor,
} from '@soldy/setup'
import { TCollapseCollectionFacade } from '@soldy/core'
import { useAdapter, VueElevatorFactory } from '../../adapter'
import BaseCollapse, { type CollapseProps } from './base.component'
import { type ICollapseProps, type ICollapseComponentProps, type ICollapse } from '@soldy/core'

export default {
	name: '_Collapse',
	extends: BaseCollapse,
	setup(props: CollapseProps, { emit }: any) {
		const adapter = createAdapterContext(CollapseDescriptor(), {
			ctrl: toRaw(props.ctrl),
			props,
		})

		const refs = useAdapter<ICollapseComponentProps, ICollapse>(adapter, props, emit)

		const collectionAdapter = createAdapterContext(
			CollapseCollectionDescriptor(),
			{
				props,
				options: { owner: adapter.instance },
			},
			{ bundle: adapter.bundle, defaultExtensions: [] },
		)
			.use(TCollectionExtension, { elevator: VueElevatorFactory })
			.use(TDragAndDropCollectionExtension, { elevator: VueElevatorFactory })

		const refsCollection = useAdapter<Record<string, any>, TCollapseCollectionFacade>(
			collectionAdapter,
			props,
			emit,
		)

		return { ...refs, ...refsCollection }
	},
}
