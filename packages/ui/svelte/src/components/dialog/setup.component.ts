import { DialogDescriptor } from '@soldy-ui/setup'
import { createSvelteAdapterContext, useAdapter, type TRootReceiver } from '../../adapter'
import type { DialogProps } from './base.component'

export function setupDialog(getProps: () => DialogProps, mountId: string, receive: TRootReceiver) {
	const adapter = createSvelteAdapterContext(DialogDescriptor(), {
		ctrl: getProps().ctrl,
		props: getProps(),
		mountId,
	})

	return useAdapter(adapter, getProps, receive)
}
