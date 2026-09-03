import { toRaw } from 'vue'
import {
	createAdapterContext,
	TCollectionItemExtension,
	TabItemDescriptor,
	TabsCollectionItemDescriptor,
} from '@soldy/setup'
import { TTabItemCollectionFacade } from '@soldy/core'
import type { ITabItemProps, ITabItem } from '@soldy/core'
import { useAdapter, VueElevatorFactory } from '../../../adapter'
import { useIconImport, useSplitAttrs } from '../../../composables'
import BaseTabItem from './base.component'
import type { TBaseComponentProps } from '../../../types'

export default {
	name: '_TabItem',
	inheritAttrs: false,
	extends: BaseTabItem,
	setup(props: TBaseComponentProps<ITabItemProps, ITabItem>, { emit }: any) {
		const adapter = createAdapterContext(TabItemDescriptor(), {
			ctrl: toRaw(props.ctrl),
			props,
		})

		const itemAdapter = createAdapterContext(
			TabsCollectionItemDescriptor(),
			{ props },
			{ bundle: adapter.bundle, defaultExtensions: [] },
		).use(TCollectionItemExtension, {
			item: adapter.instance,
			elevator: VueElevatorFactory,
		})

		const itemBinding = useAdapter<Record<string, any>, TTabItemCollectionFacade>(
			itemAdapter,
			props,
			emit,
		)
		const ownerBinding = useAdapter<ITabItemProps, ITabItem>(adapter, props, emit)

		return {
			...itemBinding,
			...ownerBinding,
			context: itemAdapter.instance.context,
			closeIconTag: useIconImport('close'),
			...useSplitAttrs(),
		}
	},
}
