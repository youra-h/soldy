import {
	TTabsContentBindingExtension,
	TabsCollectionContentDescriptor,
	TabsContentDescriptor,
} from '@soldy-ui/setup'
import {
	createSolidAdapterContext,
	useAdapter,
	useCollectionAdapter,
	useElevator,
} from '../../../adapter'
import type { TabsContentProps } from './base.component'

/** Панель таба: свой таб по `value` находит лифтом `TTabsContentBindingExtension`. */
export function setupTabsContent(props: TabsContentProps) {
	const { elevator } = useElevator()
	const adapter = createSolidAdapterContext(TabsContentDescriptor(), {
		ctrl: props.ctrl,
		props,
	})
	const owner = useAdapter(adapter, props)

	const content = createSolidAdapterContext(
		TabsCollectionContentDescriptor(),
		{ props },
		{ bundle: adapter.bundle },
	).use(TTabsContentBindingExtension, { content: adapter.instance, elevator })

	return useCollectionAdapter(content, props, owner)
}
