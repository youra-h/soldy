import { TooltipDescriptor } from '@soldy-ui/setup'
import type { ITooltip } from '@soldy-ui/core'
import { createAngularAdapterContext, useAdapter } from '../../adapter'
import type { TBinding } from '../../adapter'

export function setupTooltip(ctrl: ITooltip | undefined, props: object): TBinding<ITooltip> {
	const adapter = createAngularAdapterContext(TooltipDescriptor(), { ctrl, props })

	return useAdapter(adapter)
}
