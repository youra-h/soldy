import {
	TTabsContentBindingExtension,
	TabsContentDescriptor,
	TabsCollectionContentDescriptor,
} from '@soldy-ui/setup'
import {
	useAdapter,
	joinBindings,
	useCollectionAdapter,
	useExpose,
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
	expose: useExpose(),
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
			member: adapter,
			elevator: VueElevatorFactory,
		})

		const collectionBinding = useCollectionAdapter(contentAdapter, props, emit)
		const ownerBinding = useAdapter(adapter, props, emit)

		return joinBindings(ownerBinding, collectionBinding)
	},
}
