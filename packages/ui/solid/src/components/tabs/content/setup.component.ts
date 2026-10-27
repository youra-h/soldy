import {
	TTabsContentBindingExtension,
	TabsCollectionContentDescriptor,
	TabsContentDescriptor,
} from '@soldy-ui/setup'
import {
	createSolidAdapterContext,
	useAdapter,
	joinBindings,
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

	const content = createSolidAdapterContext(
		TabsCollectionContentDescriptor(),
		{ props },
		{ bundle: adapter.bundle },
	).use(TTabsContentBindingExtension, { content: adapter.instance, elevator })

	const itemBinding = useCollectionAdapter(content, props)
	const owner = useAdapter(adapter, props)

	return joinBindings(owner, itemBinding)
}
