import { InteractiveDescriptor } from '@soldy-ui/setup'
import { createSolidAdapterContext, useAdapter } from '../../adapter'
import type { InteractiveProps } from './base.component'

export function setupInteractive(props: InteractiveProps) {
	const adapter = createSolidAdapterContext(InteractiveDescriptor(), { ctrl: props.ctrl, props })

	return useAdapter(adapter, props)
}
