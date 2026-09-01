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

		const facade = new TTabsCollectionFacade(adapter.instance, {
			engine: toRaw(props.engine),
			items: toRaw(props.items),
			trackBy: toRaw(props.trackBy),
		})

		const collectionAdapter = createAdapterContext(TabsCollectionDescriptor(), {
			ctrl: facade,
			props,
		})
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
