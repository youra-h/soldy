import { toRaw } from 'vue'
import {
	createAdapterContext,
	TCollectionItemExtension,
	CollapseItemDescriptor,
	CollapseCollectionItemDescriptor,
} from '@soldy/setup'
import { TCollapseItemCollectionFacade } from '@soldy/core'
import type { ICollapseItemProps, ICollapseItem } from '@soldy/core'
import { useVue, VueElevatorFactory } from '../../../adapter'
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
		})

		const itemAdapter = createAdapterContext(
			CollapseCollectionItemDescriptor(),
			{ props },
			{ bundle: adapter.bundle },
		).use(TCollectionItemExtension, {
			item: adapter.instance,
			elevator: VueElevatorFactory,
		})

		const itemBinding = useVue<Record<string, any>, TCollapseItemCollectionFacade>(
			itemAdapter,
			props,
			emit,
		)
		const ownerBinding = useVue<ICollapseItemProps, ICollapseItem>(adapter, props, emit)

		return {
			...itemBinding,
			...ownerBinding,
			context: itemAdapter.instance.context,
			arrowIconTag: useIconImport('arrowRight'),
			...useSplitAttrs(),
		}
	},
}
