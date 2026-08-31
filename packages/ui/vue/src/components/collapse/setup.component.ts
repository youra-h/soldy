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
import {
	type ICollapseProps,
	type ICollapseComponentProps,
	type ICollapse,
} from '@soldy/core'

export default {
	name: '_Collapse',
	extends: BaseCollapse,
	setup(props: TBaseComponentProps<ICollapseProps, ICollapse>, { emit }: any) {
		const adapter = createAdapterContext(CollapseDescriptor(), {
			ctrl: toRaw(props.ctrl),
			props,
		})

		const facade = new TCollapseCollectionFacade(adapter.instance, {
			engine: toRaw(props.engine),
			items: toRaw(props.items),
			trackBy: toRaw(props.trackBy),
		})

		const collectionAdapter = createAdapterContext(CollapseCollectionDescriptor(), {
			ctrl: facade,
			props,
		})
			.use(TCollectionExtension, { elevator: VueElevatorFactory })
			.use(TDragAndDropCollectionExtension, { elevator: VueElevatorFactory })

		const collectionBinding = useVue<Record<string, any>, TCollapseCollectionFacade>(
			collectionAdapter,
			props,
			emit,
		)

		const ownerBinding = useVue<ICollapseComponentProps, ICollapse>(adapter, props, emit)

		return { ...collectionBinding, ...ownerBinding }
	},
}
