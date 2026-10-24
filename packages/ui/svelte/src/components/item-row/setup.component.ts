import { ItemRowDescriptor } from '@soldy-ui/setup'
import { createSvelteAdapterContext, useAdapter, type TRootReceiver } from '../../adapter'
import type { ButtonProps } from '../button/base.component'

export function setupItemRow(getProps: () => ButtonProps, mountId: string, receive: TRootReceiver) {
	const adapter = createSvelteAdapterContext(ItemRowDescriptor(), {
		ctrl: getProps().ctrl,
		props: getProps(),
		mountId,
	})

	return useAdapter(adapter, getProps, receive)
}
