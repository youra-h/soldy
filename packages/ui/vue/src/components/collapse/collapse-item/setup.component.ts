import { toRaw } from 'vue'
import { createAdapterContext, TPluginsBindingExtension, TCollectionItemExtension, CollapseItemDescriptor } from '@soldy/setup'
import { useVue, VueElevatorFactory } from '../../../adapter'
import { useIconImport, useSplitAttrs } from '../../../composables'
import BaseCollapseItem from './collapse-item.component'
import type { TBaseComponentProps } from '../../../types'
import { type ICollapseItemProps, type ICollapseItem } from '@soldy/core'

export default {
	name: '_CollapseItem',
	inheritAttrs: false,
	extends: BaseCollapseItem,
	setup(props: TBaseComponentProps<ICollapseItemProps, ICollapseItem>, { emit }: any) {
		const adapter = createAdapterContext(CollapseItemDescriptor, {
			ctrl: props.ctrl ? toRaw(props.ctrl) : undefined,
			plugins: props.plugins,
			props,
		})
			.use(TPluginsBindingExtension)
			.use(TCollectionItemExtension, { elevator: VueElevatorFactory })

		return {
			...useVue(adapter, props, emit),
			arrowIconTag: useIconImport('arrowRight'),
			...useSplitAttrs(),
		}
	},
}
