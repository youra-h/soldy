import { toRaw } from 'vue'
import {
	createAdapterContext,
	TCollectionExtension,
	TDragAndDropCollectionExtension,
	TabsDescriptor,
	TabsCollectionDescriptor,
} from '@soldy/setup'
import { TTabsCollectionFacade } from '@soldy/core'
import { useVue, VueElevatorFactory } from '../../adapter'
import BaseTabs from './base.component'
import type { TBaseComponentProps } from '../../types'
import { type ITabsProps, type ITabsComponentProps, type ITabs } from '@soldy/core'

export default {
	name: '_Tabs',
	extends: BaseTabs,
	setup(props: TBaseComponentProps<ITabsProps, ITabs>, { emit }: any) {
		const adapter = createAdapterContext(TabsDescriptor(), {
			ctrl: toRaw(props.ctrl),
			props,
		})

		const refs = useVue<ITabsComponentProps, ITabs>(adapter, props, emit)

		const collectionAdapter = createAdapterContext(
			TabsCollectionDescriptor(),
			{
				props,
				options: { owner: adapter.instance },
			},
			{ bundle: adapter.bundle, defaultExtensions: [] },
		)
			.use(TCollectionExtension, { elevator: VueElevatorFactory })
			.use(TDragAndDropCollectionExtension, { elevator: VueElevatorFactory })

		const refsCollection = useVue<Record<string, any>, TTabsCollectionFacade>(
			collectionAdapter,
			props,
			emit,
		)

		return { ...refs, ...refsCollection }
	},
}
