import { StylableDescriptor } from '@soldy-ui/setup'
import { createSvelteAdapterContext, useAdapter } from '../../adapter'
import type { StylableProps } from './base.component'

export function setupStylable(getProps: () => StylableProps, mountId: string) {
	const adapter = createSvelteAdapterContext(StylableDescriptor(), {
		ctrl: getProps().ctrl,
		props: getProps(),
		mountId,
	})

	return useAdapter(adapter, getProps)
}
