import { InteractiveDescriptor } from '@soldy-ui/setup'
import { createSvelteAdapterContext, useAdapter } from '../../adapter'
import type { InteractiveProps } from './base.component'

export function setupInteractive(getProps: () => InteractiveProps, mountId: string) {
	const adapter = createSvelteAdapterContext(InteractiveDescriptor(), {
		ctrl: getProps().ctrl,
		props: getProps(),
		mountId,
	})

	return useAdapter(adapter, getProps)
}
