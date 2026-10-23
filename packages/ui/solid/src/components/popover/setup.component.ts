import { PopoverDescriptor } from '@soldy-ui/setup'
import { createSolidAdapterContext, useAdapter } from '../../adapter'
import type { PopoverProps } from './base.component'

export function setupPopover(props: PopoverProps) {
	const adapter = createSolidAdapterContext(PopoverDescriptor(), { ctrl: props.ctrl, props })

	return useAdapter(adapter, props)
}
