import { ValueControlDescriptor } from '@soldy-ui/setup'
import { createSvelteAdapterContext, useAdapter } from '../../adapter'
import type { ValueControlProps } from './base.component'

export function setupValueControl(getProps: () => ValueControlProps, mountId: string) {
	const adapter = createSvelteAdapterContext(ValueControlDescriptor(), {
		ctrl: getProps().ctrl,
		props: getProps(),
		mountId,
	})

	return useAdapter(adapter, getProps)
}
