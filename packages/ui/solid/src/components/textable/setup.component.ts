import { TextableDescriptor } from '@soldy-ui/setup'
import { createSolidAdapterContext, useAdapter } from '../../adapter'
import type { TextableProps } from './base.component'

export function setupTextable(props: TextableProps) {
	const adapter = createSolidAdapterContext(TextableDescriptor(), { ctrl: props.ctrl, props })

	return useAdapter(adapter, props)
}
