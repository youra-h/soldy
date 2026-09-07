import { toRaw } from 'vue'
import {
	createAdapterContext,
	TCollectionItemExtension,
	TabsItemDescriptor,
	TabsCollectionItemDescriptor,
} from '@soldy/setup'
import { TTabsItemCollectionFacade } from '@soldy/core'
import type { ITabsItemProps, ITabsItem } from '@soldy/core'
import { useAdapter, VueElevatorFactory } from '../../../adapter'
import { useIconImport, useSplitAttrs } from '../../../composables'
import BaseTabsItem, { type TabsItemProps } from './base.component'

export default {
	name: '_TabsItem',
	inheritAttrs: false,
	extends: BaseTabsItem,
	setup(props: TabsItemProps, { emit }: any) {
		const adapter = createAdapterContext(TabsItemDescriptor(), {
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

		const itemBinding = useAdapter<Record<string, any>, TTabsItemCollectionFacade>(
			itemAdapter,
			props,
			emit,
		)
		const ownerBinding = useAdapter<ITabsItemProps, ITabsItem>(adapter, props, emit)

		return {
			...itemBinding,
			...ownerBinding,
			context: itemAdapter.instance.context,
			closeIconTag: useIconImport('close'),
			...useSplitAttrs(),
		}
	},
}
