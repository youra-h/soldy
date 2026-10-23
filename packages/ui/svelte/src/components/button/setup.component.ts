import { ButtonDescriptor } from '@soldy-ui/setup'
import { createSvelteAdapterContext, useAdapter, type TRootReceiver } from '../../adapter'
import type { ButtonProps } from './base.component'

export function setupButton(getProps: () => ButtonProps, mountId: string, receive: TRootReceiver) {
	const adapter = createSvelteAdapterContext(ButtonDescriptor(), {
		ctrl: getProps().ctrl,
		props: getProps(),
		mountId,
	})

	return useAdapter(adapter, getProps, receive)
}
