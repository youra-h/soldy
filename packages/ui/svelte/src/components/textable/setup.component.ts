import { TextableDescriptor } from '@soldy-ui/setup'
import { createSvelteAdapterContext, useAdapter } from '../../adapter'
import type { TextableProps } from './base.component'

export function setupTextable(getProps: () => TextableProps, mountId: string) {
	const adapter = createSvelteAdapterContext(TextableDescriptor(), {
		ctrl: getProps().ctrl,
		props: getProps(),
		mountId,
	})

	return useAdapter(adapter, getProps)
}
