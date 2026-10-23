import { InputControlDescriptor } from '@soldy-ui/setup'
import { createSolidAdapterContext, useAdapter } from '../../adapter'
import type { InputControlProps } from './base.component'

export function setupInputControl(props: InputControlProps) {
	const adapter = createSolidAdapterContext(InputControlDescriptor(), { ctrl: props.ctrl, props })

	return useAdapter(adapter, props)
}
