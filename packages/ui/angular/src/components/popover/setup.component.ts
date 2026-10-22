import { PopoverDescriptor } from '@soldy-ui/setup'
import type { IPopover } from '@soldy-ui/core'
import { createAngularAdapterContext, useAdapter } from '../../adapter'
import type { TBinding } from '../../adapter'

export function setupPopover(ctrl: IPopover | undefined, props: object): TBinding<IPopover> {
	const adapter = createAngularAdapterContext(PopoverDescriptor(), { ctrl, props })

	return useAdapter(adapter)
}
