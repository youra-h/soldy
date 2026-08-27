import { toRaw } from 'vue'
import {
	createAdapterContext,
	TCollectionItemExtension,
	TCollectionItemContextExtension,
	TCollectionItemMetaExtension,
	TabItemDescriptor,
	TabsCollectionDescriptor,
} from '@soldy/setup'
import type { ITabItemProps, ITabItem, TTabsCollectionExtensions } from '@soldy/core'
import { useVue, useVueCollectionItem, VueElevatorFactory } from '../../../adapter'
import { useIconImport, useSplitAttrs } from '../../../composables'
import BaseTabItem from './base.component'
import type { TBaseComponentProps } from '../../../types'

export default {
	name: '_TabItem',
	inheritAttrs: false,
	extends: BaseTabItem,
	setup(props: TBaseComponentProps<ITabItemProps, ITabItem>, { emit }: any) {
		const adapter = createAdapterContext(TabItemDescriptor, {
			ctrl: toRaw(props.ctrl),
			props,
		})
			.use(TCollectionItemContextExtension, {
				descriptor: TabsCollectionDescriptor,
				elevator: VueElevatorFactory,
			})
			.use(TCollectionItemExtension, { elevator: VueElevatorFactory })
			.use(TCollectionItemMetaExtension, {
				descriptor: TabsCollectionDescriptor,
				elevator: VueElevatorFactory,
			})

		const { context, ...itemRefs } = useVueCollectionItem<ITabItem, TTabsCollectionExtensions>(
			adapter,
			props,
		)

		return {
			...useVue<ITabItemProps, ITabItem>(adapter, props, emit),
			...itemRefs,
			context,
			closeIconTag: useIconImport('close'),
			...useSplitAttrs(),
		}
	},
}
