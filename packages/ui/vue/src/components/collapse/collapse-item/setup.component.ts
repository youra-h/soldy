import { toRaw } from 'vue'
import {
	createAdapterContext,
	TCollectionItemExtension,
	CollapseItemDescriptor,
	CollapseCollectionItemDescriptor,
} from '@soldy/setup'
import { TCollapseItemCollectionFacade } from '@soldy/core'
import type { ICollapseItemProps, ICollapseItem } from '@soldy/core'
import { useAdapter, VueElevatorFactory } from '../../../adapter'
import { useIconImport, useSplitAttrs } from '../../../composables'
import BaseCollapseItem, { type CollapseItemProps } from './base.component'

export default {
	name: '_CollapseItem',
	inheritAttrs: false,
	extends: BaseCollapseItem,
	setup(props: CollapseItemProps, { emit }: any) {
		const adapter = createAdapterContext(CollapseItemDescriptor(), {
			ctrl: toRaw(props.ctrl),
			props,
		})

		const itemAdapter = createAdapterContext(
			CollapseCollectionItemDescriptor(),
			{ props },
			{ bundle: adapter.bundle, defaultExtensions: [] },
		).use(TCollectionItemExtension, {
			item: adapter.instance,
			elevator: VueElevatorFactory,
		})

		const itemBinding = useAdapter<Record<string, any>, TCollapseItemCollectionFacade>(
			itemAdapter,
			props,
			emit,
		)
		const ownerBinding = useAdapter<ICollapseItemProps, ICollapseItem>(adapter, props, emit)

		return {
			...itemBinding,
			...ownerBinding,
			context: itemAdapter.instance.context,
			arrowIconTag: useIconImport('arrowRight'),
			...useSplitAttrs(),
		}
	},
}
