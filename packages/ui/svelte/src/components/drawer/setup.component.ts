import { DrawerDescriptor } from '@soldy-ui/setup'
import { createSvelteAdapterContext, useAdapter, type TRootReceiver } from '../../adapter'
import type { DrawerProps } from './base.component'

export function setupDrawer(getProps: () => DrawerProps, mountId: string, receive: TRootReceiver) {
	const adapter = createSvelteAdapterContext(DrawerDescriptor(), {
		ctrl: getProps().ctrl,
		props: getProps(),
		mountId,
	})

	return useAdapter(adapter, getProps, receive)
}
