import { ValueControlDescriptor } from '@soldy-ui/setup'
import { createSolidAdapterContext, useAdapter } from '../../adapter'
import type { ValueControlProps } from './base.component'

export function setupValueControl(props: ValueControlProps) {
	const adapter = createSolidAdapterContext(ValueControlDescriptor(), { ctrl: props.ctrl, props })

	return useAdapter(adapter, props)
}
