import { LabelDescriptor } from '@soldy-ui/setup'
import { createSolidAdapterContext, useAdapter } from '../../adapter'
import type { LabelProps } from './base.component'

export function setupLabel(props: LabelProps) {
	const adapter = createSolidAdapterContext(LabelDescriptor(), { ctrl: props.ctrl, props })

	return useAdapter(adapter, props)
}
