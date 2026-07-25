import { useCollectionItemAdapter } from '../../../adapter'
import { CollapseItemDescriptor } from '@soldy/setup'
import BaseCollapseItem from './collapse-item.component'
import { useIconImport, useSplitAttrs } from '../../../composables'
import type { TBaseComponentProps } from '../../../types'
import { type ICollapseItemProps, type ICollapseItem } from '@soldy/core'

export default {
	name: '_CollapseItem',
	inheritAttrs: false,
	extends: BaseCollapseItem,
	setup(props: TBaseComponentProps<ICollapseItemProps, ICollapseItem>, { emit }: any) {
		return {
			...useCollectionItemAdapter(CollapseItemDescriptor, props, emit),
			arrowIconTag: useIconImport('arrowRight'),
			...useSplitAttrs(),
		}
	},
}
