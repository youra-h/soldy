import { toRaw } from 'vue'
import {
	createAdapterContext,
	TCollectionExtension,
	TCollectionFactoryExtension,
	TCollectionPropsExtension,
	TDragAndDropCollectionExtension,
	TabsDescriptor,
	TabsCollectionDescriptor,
} from '@soldy/setup'
import { useVue, useVueCollection, VueElevatorFactory } from '../../adapter'
import BaseTabs from './base.component'
import type { TBaseComponentProps } from '../../types'
import { type ITabsProps, type ITabs } from '@soldy/core'

export default {
	name: '_Tabs',
	extends: BaseTabs,
	setup(props: TBaseComponentProps<ITabsProps, ITabs>, { emit }: any) {
		const adapter = createAdapterContext(TabsDescriptor, {
			ctrl: toRaw(props.ctrl),
			props,
		})
			.use(TCollectionFactoryExtension, {
				descriptor: TabsCollectionDescriptor,
				engine: toRaw(props.engine),
				elevator: VueElevatorFactory,
			})
			.use(TCollectionPropsExtension)
			.use(TCollectionExtension, { elevator: VueElevatorFactory })
			.use(TDragAndDropCollectionExtension, { elevator: VueElevatorFactory })

		return {
			...useVue<ITabsProps, ITabs>(adapter, props, emit),
			...useVueCollection(adapter, props),
		}
	},
}
