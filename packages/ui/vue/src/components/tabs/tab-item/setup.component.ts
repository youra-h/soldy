import { toRaw } from 'vue'
import {
	createAdapterContext,
	TCollectionItemExtension,
	TCollectionItemContextExtension,
	TabItemDescriptor,
	TabsCollectionItemDescriptor,
} from '@soldy/setup'
import { useVue, useVueCollectionItem, VueElevatorFactory } from '../../../adapter'
import { useIconImport, useSplitAttrs } from '../../../composables'
import BaseTabItem from './tab-item.component'
import type { TBaseComponentProps } from '../../../types'
import { type ITabItemProps, type ITabItem } from '@soldy/core'

export default {
	name: '_TabItem',
	inheritAttrs: false,
	extends: BaseTabItem,
	setup(props: TBaseComponentProps<ITabItemProps, ITabItem>, { emit }: any) {
		const adapter = createAdapterContext(TabItemDescriptor, {
			ctrl: props.ctrl ? toRaw(props.ctrl) : undefined,
			props,
		})
			.use(TCollectionItemExtension, { elevator: VueElevatorFactory })
			.use(TCollectionItemContextExtension, {
				elevator: VueElevatorFactory,
				descriptor: TabsCollectionItemDescriptor,
			})

		const itemExt = adapter.get(TCollectionItemContextExtension)

		return {
			...useVue<ITabItemProps, ITabItem>(adapter, props, emit),
			...useVueCollectionItem(itemExt, props, emit),
			close: () => itemExt?.itemContext?.adapters?.tabs?.close(),
			closeIconTag: useIconImport('close'),
			...useSplitAttrs(),
		}
	},
}
