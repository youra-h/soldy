import { toRaw } from 'vue'
import {
	createAdapterContext,
	TCollectionItemExtension,
	TabItemDescriptor,
	TabsCollectionItemDescriptor,
} from '@soldy/setup'
import { TTabItemCollectionFacade } from '@soldy/core'
import type { ITabItemProps, ITabItem } from '@soldy/core'
import { useVue, VueElevatorFactory } from '../../../adapter'
import { useIconImport, useSplitAttrs } from '../../../composables'
import BaseTabItem from './base.component'
import type { TBaseComponentProps } from '../../../types'

export default {
	name: '_TabItem',
	inheritAttrs: false,
	extends: BaseTabItem,
	setup(props: TBaseComponentProps<ITabItemProps, ITabItem>, { emit }: any) {
		const facade = new TTabItemCollectionFacade()

		const adapter = createAdapterContext(TabItemDescriptor(), {
			ctrl: toRaw(props.ctrl),
			props,
		}).use(TCollectionItemExtension, {
			facade,
			itemDescriptor: TabsCollectionItemDescriptor(),
			elevator: VueElevatorFactory,
		})

		const itemAdapter = createAdapterContext(TabsCollectionItemDescriptor(), {
			ctrl: facade,
			props,
		})

		const itemBinding = useVue<Record<string, any>, TTabItemCollectionFacade>(
			itemAdapter,
			props,
			emit,
		)
		const ownerBinding = useVue<ITabItemProps, ITabItem>(adapter, props, emit)

		return {
			...itemBinding,
			...ownerBinding,
			context: facade.context,
			closeIconTag: useIconImport('close'),
			...useSplitAttrs(),
		}
	},
}
