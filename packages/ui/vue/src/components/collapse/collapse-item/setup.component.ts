import { toRaw } from 'vue'
import {
	createAdapterContext,
	TCollectionItemExtension,
	CollapseItemDescriptor,
} from '@soldy/setup'
import { useVue, VueElevatorFactory } from '../../../adapter'
import { useIconImport, useSplitAttrs } from '../../../composables'
import BaseCollapseItem from './collapse-item.component'
import type { TBaseComponentProps } from '../../../types'
import { type ICollapseItemProps, type ICollapseItem } from '@soldy/core'

export default {
	name: '_CollapseItem',
	inheritAttrs: false,
	extends: BaseCollapseItem,
	setup(props: TBaseComponentProps<ICollapseItemProps, ICollapseItem>, { emit }: any) {
		const adapter = createAdapterContext(CollapseItemDescriptor(), {
			ctrl: toRaw(props.ctrl),
			props,
		}).use(TCollectionItemExtension, { elevator: VueElevatorFactory })

		return {
			...useVue<ICollapseItemProps, ICollapseItem>(adapter, props, emit),
			arrowIconTag: useIconImport('arrowRight'),
			...useSplitAttrs(),
		}
	},
}
