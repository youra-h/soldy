import { toRaw } from 'vue'
import {
	createAdapterContext,
	createCollectionContext,
	TCollectionItemElevatorExtension,
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
			ctrl: props.ctrl ? toRaw(props.ctrl) : undefined,
			props,
		})

		const colCtx = createCollectionContext(TabsCollectionDescriptor, adapter.instance).use(
			TCollectionItemElevatorExtension,
			{ elevator: VueElevatorFactory },
		)

		return {
			...useVue<ITabsProps, ITabs>(adapter, props, emit),
			...useVueCollection(colCtx, props, emit),
		}
	},
}
