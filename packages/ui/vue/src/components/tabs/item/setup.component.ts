import {
	TCollectionItemExtension,
	TabsItemDescriptor,
	TabsCollectionItemDescriptor,
} from '@soldy/setup'
import { TTabsItemCollectionFacade } from '@soldy/core'
import type { ITabsItemProps, ITabsItem } from '@soldy/core'
import {
	useAdapter,
	VueElevatorFactory,
	useIcon,
	useSplitAttrs,
	createVueAdapterContext,
	type SetupContext,
} from '../../../adapter'
import BaseTabsItem, { type TabsItemProps } from './base.component'

export default {
	name: '_TabsItem',
	inheritAttrs: false,
	extends: BaseTabsItem,
	setup(props: TabsItemProps, { emit }: SetupContext) {
		const adapter = createVueAdapterContext(TabsItemDescriptor(), {
			ctrl: props.ctrl,
			props,
		})

		const itemAdapter = createVueAdapterContext(
			TabsCollectionItemDescriptor(),
			{ props },
			{ bundle: adapter.bundle, defaultExtensions: [] },
		).use(TCollectionItemExtension, {
			item: adapter.instance,
			elevator: VueElevatorFactory,
		})

		const itemBinding = useAdapter<TabsItemProps, TTabsItemCollectionFacade>(
			itemAdapter,
			props,
			emit,
		)
		const ownerBinding = useAdapter<ITabsItemProps, ITabsItem>(adapter, props, emit)

		return {
			...itemBinding,
			...ownerBinding,
			context: itemAdapter.instance.context,
			closeIconTag: useIcon('close'),
			...useSplitAttrs(),
		}
	},
}
