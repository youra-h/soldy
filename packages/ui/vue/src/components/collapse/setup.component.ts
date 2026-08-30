import { toRaw } from 'vue'
import {
	createAdapterContext,
	TCollectionExtension,
	TDragAndDropCollectionExtension,
	CollapseDescriptor,
	CollapseCollectionDescriptor,
} from '@soldy/setup'
import { useVue, useVueCollection, VueElevatorFactory } from '../../adapter'
import BaseCollapse from './base.component'
import type { TBaseComponentProps } from '../../types'
import {
	type ICollapseProps,
	type ICollapseComponentProps,
	type ICollapse,
	type ICollapseCollectionOutput,
} from '@soldy/core'

export default {
	name: '_Collapse',
	extends: BaseCollapse,
	setup(props: TBaseComponentProps<ICollapseProps, ICollapse>, { emit }: any) {
		const adapter = createAdapterContext(CollapseDescriptor(), {
			ctrl: toRaw(props.ctrl),
			props,
		})
			.use(TCollectionExtension, {
				descriptor: CollapseCollectionDescriptor(),
				engine: toRaw(props.engine),
				elevator: VueElevatorFactory,
			})
			.use(TDragAndDropCollectionExtension, { elevator: VueElevatorFactory })

		const collectionRefs = useVueCollection<ICollapseCollectionOutput>(adapter, props)

		return {
			...useVue<ICollapseComponentProps, ICollapse>(adapter, props, emit),
			...collectionRefs,
		}
	},
}
