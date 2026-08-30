import { toRaw } from 'vue'
import {
	createAdapterContext,
	TCollectionItemExtension,
	CollapseItemDescriptor,
	CollapseCollectionDescriptor,
} from '@soldy/setup'
import type { ICollapseItemProps, ICollapseItem, TCollapseCollectionExtensions } from '@soldy/core'
import { useVue, useVueCollectionItem, VueElevatorFactory } from '../../../adapter'
import { useIconImport, useSplitAttrs } from '../../../composables'
import BaseCollapseItem from './base.component'
import type { TBaseComponentProps } from '../../../types'

export default {
	name: '_CollapseItem',
	inheritAttrs: false,
	extends: BaseCollapseItem,
	setup(props: TBaseComponentProps<ICollapseItemProps, ICollapseItem>, { emit }: any) {
		const adapter = createAdapterContext(CollapseItemDescriptor(), {
			ctrl: toRaw(props.ctrl),
			props,
		}).use(TCollectionItemExtension, {
			descriptor: CollapseCollectionDescriptor(),
			elevator: VueElevatorFactory,
		})

		const { context, ...itemRefs } = useVueCollectionItem<
			ICollapseItem,
			TCollapseCollectionExtensions
		>(adapter, props)

		return {
			...useVue<ICollapseItemProps, ICollapseItem>(adapter, props, emit),
			...itemRefs,
			context,
			arrowIconTag: useIconImport('arrowRight'),
			...useSplitAttrs(),
		}
	},
}
