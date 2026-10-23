import { TVirtualExtension, VirtualDescriptor } from '@soldy-ui/setup'
import { createSvelteAdapterContext, useAdapter, useElevator } from '../../adapter'
import type { VirtualProps } from './base.component'

export function setupVirtual(getProps: () => VirtualProps, mountId: string) {
	const elevator = useElevator()
	const adapter = createSvelteAdapterContext(VirtualDescriptor(), {
		ctrl: getProps().ctrl,
		props: getProps(),
		mountId,
	}).use(TVirtualExtension, { elevator })

	return useAdapter(adapter, getProps)
}
