import {
	TTabsContentBindingExtension,
	TabsContentDescriptor,
	TabsCollectionContentDescriptor,
} from '@soldy-ui/setup'
import {
	useAdapter,
	VueElevatorFactory,
	createVueAdapterContext,
	type SetupContext,
} from '../../../adapter'
import BaseTabsContent, { type TabsContentProps } from './base.component'

/**
 * Два контекста, как у TabsItem: собственный (props панели) и коллекционный
 * (активность и ARIA-связка через фасад). Разделение слоёв — не формальность:
 * панель сама по себе о коллекции ничего не знает.
 */
export default {
	name: '_TabsContent',
	extends: BaseTabsContent,
	setup(props: TabsContentProps, { emit }: SetupContext) {
		const adapter = createVueAdapterContext(TabsContentDescriptor(), {
			ctrl: props.ctrl,
			props,
		})

		const contentAdapter = createVueAdapterContext(
			TabsCollectionContentDescriptor(),
			{ props },
			{ bundle: adapter.bundle },
		).use(TTabsContentBindingExtension, {
			content: adapter.instance,
			elevator: VueElevatorFactory,
		})

		const collectionBinding = useAdapter(contentAdapter, props, emit)
		const ownerBinding = useAdapter(adapter, props, emit)

		return { ...collectionBinding, ...ownerBinding }
	},
}
