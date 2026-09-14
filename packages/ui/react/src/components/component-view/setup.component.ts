/**
 * useSetupComponentView — setup-слой ComponentView (аналог setup.component.ts во Vue).
 */

import { createAdapterContext, ComponentViewDescriptor } from '@soldy/setup'
import type { IComponentView } from '@soldy/core'
import { useAdapter, useAdapterContext } from '../../adapter'
import type { ComponentViewProps } from './base.component'

export function useSetupComponentView(props: ComponentViewProps) {
	const adapter = useAdapterContext<IComponentView>(() =>
		createAdapterContext(ComponentViewDescriptor(), { ctrl: props.ctrl, props }),
	)

	return useAdapter(adapter, props)
}
