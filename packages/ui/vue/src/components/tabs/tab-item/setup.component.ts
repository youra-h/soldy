import { toRaw } from 'vue'
import { createAdapterContext, TCollectionItemExtension, TabItemDescriptor } from '@soldy/setup'
import { useVue, VueElevatorFactory } from '../../../adapter'
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
			plugins: props.plugins,
			props,
		}).use(TCollectionItemExtension, { elevator: VueElevatorFactory })

		return {
			...useVue(adapter, props, emit),
			closeIconTag: useIconImport('close'),
			...useSplitAttrs(),
		}
	},
}
