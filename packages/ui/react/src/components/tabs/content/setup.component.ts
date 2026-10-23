import {
	TTabsContentBindingExtension,
	TabsCollectionContentDescriptor,
	TabsContentDescriptor,
} from '@soldy-ui/setup'
import { useAdapter, useAdapterContext, useCollectionAdapter } from '../../../adapter'
import type { TabsContentProps } from './base.component'

export function useSetupTabsContent(props: TabsContentProps) {
	const {
		contexts: [adapter, content],
	} = useAdapterContext((create, elevator) => {
		const adapter = create(TabsContentDescriptor(), { ctrl: props.ctrl, props })

		const content = create(
			TabsCollectionContentDescriptor(),
			{ props },
			{ bundle: adapter.bundle },
		).use(TTabsContentBindingExtension, { content: adapter.instance, elevator })

		return [adapter, content] as const
	})

	return useCollectionAdapter(useAdapter(adapter, props), content, props)
}
