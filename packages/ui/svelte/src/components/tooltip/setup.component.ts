import { TooltipDescriptor } from '@soldy-ui/setup'
import { createSvelteAdapterContext, useAdapter, type TRootReceiver } from '../../adapter'
import type { TooltipProps } from './base.component'

export function setupTooltip(
	getProps: () => TooltipProps,
	mountId: string,
	receive: TRootReceiver,
) {
	const adapter = createSvelteAdapterContext(TooltipDescriptor(), {
		ctrl: getProps().ctrl,
		props: getProps(),
		mountId,
	})

	return useAdapter(adapter, getProps, receive)
}
