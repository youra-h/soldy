import { ControlDescriptor } from '@soldy-ui/setup'
import { createSolidAdapterContext, useAdapter } from '../../adapter'
import type { ControlProps } from './base.component'

export function setupControl(props: ControlProps) {
	const adapter = createSolidAdapterContext(ControlDescriptor(), { ctrl: props.ctrl, props })

	return useAdapter(adapter, props)
}
