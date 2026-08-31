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
		const facade = new TCollapseItemCollectionFacade()

		const adapter = createAdapterContext(CollapseItemDescriptor(), {
			ctrl: toRaw(props.ctrl),
			props,
		}).use(TCollectionItemExtension, {
			facade,
			itemDescriptor: CollapseCollectionItemDescriptor(),
			elevator: VueElevatorFactory,
		})

		const itemAdapter = createAdapterContext(CollapseCollectionItemDescriptor(), {
			ctrl: facade,
			props,
		})

		const itemBinding = useVue<Record<string, any>, TCollapseItemCollectionFacade>(itemAdapter, props, emit)
		const ownerBinding = useVue<ICollapseItemProps, ICollapseItem>(adapter, props, emit)

		return {
			...itemBinding,
			...ownerBinding,
			context: facade.context,
			arrowIconTag: useIconImport('arrowRight'),
			...useSplitAttrs(),
		}
	},
}
