/**
 * useSetupComponentView — setup-слой ComponentView (аналог setup.component.ts во Vue).
 */

import { createAdapterContext, ComponentViewDescriptor } from '@soldy-ui/setup'
import { useAdapter, useAdapterContext } from '../../adapter'
import type { ComponentViewProps } from './base.component'

export function useSetupComponentView(props: ComponentViewProps) {
	const adapter = useAdapterContext(() =>
		createAdapterContext(ComponentViewDescriptor(), { ctrl: props.ctrl, props }),
	)

	return useAdapter(adapter, props)
}
