import { IconDescriptor } from '@soldy-ui/setup'
import { createSvelteAdapterContext, useAdapter, type TRootReceiver } from '../../adapter'
import type { IconProps } from './base.component'

export function setupIcon(getProps: () => IconProps, mountId: string, receive: TRootReceiver) {
	const adapter = createSvelteAdapterContext(IconDescriptor(), {
		ctrl: getProps().ctrl,
		props: getProps(),
		mountId,
	})

	return useAdapter(adapter, getProps, receive)
}
