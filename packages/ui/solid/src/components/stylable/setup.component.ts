import { StylableDescriptor } from '@soldy-ui/setup'
import { createSolidAdapterContext, useAdapter } from '../../adapter'
import type { StylableProps } from './base.component'

export function setupStylable(props: StylableProps) {
	const adapter = createSolidAdapterContext(StylableDescriptor(), { ctrl: props.ctrl, props })

	return useAdapter(adapter, props)
}
