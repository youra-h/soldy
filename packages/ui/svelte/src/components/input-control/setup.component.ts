import { InputControlDescriptor } from '@soldy-ui/setup'
import { createSvelteAdapterContext, useAdapter } from '../../adapter'
import type { InputControlProps } from './base.component'

export function setupInputControl(getProps: () => InputControlProps, mountId: string) {
	const adapter = createSvelteAdapterContext(InputControlDescriptor(), {
		ctrl: getProps().ctrl,
		props: getProps(),
		mountId,
	})

	return useAdapter(adapter, getProps)
}
