import { toRaw } from 'vue'
import {
	createAdapterContext,
	TTabsContentExtension,
	TabsContentDescriptor,
	TabsCollectionContentDescriptor,
} from '@soldy/setup'
import type { ITabsContent, ITabsContentProps } from '@soldy/core'
import type { TTabsContentCollectionFacade } from '@soldy/core'
import { useAdapter, VueElevatorFactory } from '../../../adapter'
import BaseTabsContent, { type TabsContentProps } from './base.component'

/**
 * Два контекста, как у TabItem: собственный (props панели) и коллекционный
 * (активность и ARIA-связка через фасад). Разделение слоёв — не формальность:
 * панель сама по себе о коллекции ничего не знает.
 */
export default {
	name: '_TabsContent',
	extends: BaseTabsContent,
	setup(props: TabsContentProps, { emit }: any) {
		const adapter = createAdapterContext(TabsContentDescriptor(), {
			ctrl: toRaw(props.ctrl),
			props,
		})

		const contentAdapter = createAdapterContext(
			TabsCollectionContentDescriptor(),
			{ props },
			{ bundle: adapter.bundle, defaultExtensions: [] },
		).use(TTabsContentExtension, {
			content: adapter.instance,
			elevator: VueElevatorFactory,
		})

		const collectionBinding = useAdapter<Record<string, any>, TTabsContentCollectionFacade>(
			contentAdapter,
			props,
			emit,
		)
		const ownerBinding = useAdapter<ITabsContentProps, ITabsContent>(adapter, props, emit)

		return { ...collectionBinding, ...ownerBinding }
	},
}
