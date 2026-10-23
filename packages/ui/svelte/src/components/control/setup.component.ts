import { ControlDescriptor } from '@soldy-ui/setup'
import { createSvelteAdapterContext, useAdapter } from '../../adapter'
import type { ControlProps } from './base.component'

export function setupControl(getProps: () => ControlProps, mountId: string) {
	const adapter = createSvelteAdapterContext(ControlDescriptor(), {
		ctrl: getProps().ctrl,
		props: getProps(),
		mountId,
	})

	return useAdapter(adapter, getProps)
}
