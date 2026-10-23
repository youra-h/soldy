import { FrameDescriptor } from '@soldy-ui/setup'
import { createSvelteAdapterContext, useAdapter, type TRootReceiver } from '../../adapter'
import type { FrameProps } from './base.component'

export function setupFrame(getProps: () => FrameProps, mountId: string, receive: TRootReceiver) {
	const adapter = createSvelteAdapterContext(FrameDescriptor(), {
		ctrl: getProps().ctrl,
		props: getProps(),
		mountId,
	})

	return useAdapter(adapter, getProps, receive)
}
