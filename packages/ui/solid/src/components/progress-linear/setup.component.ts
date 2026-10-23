import { ProgressLinearDescriptor } from '@soldy-ui/setup'
import { createSolidAdapterContext, useAdapter } from '../../adapter'
import type { ProgressLinearProps } from './base.component'

export function setupProgressLinear(props: ProgressLinearProps) {
	const adapter = createSolidAdapterContext(ProgressLinearDescriptor(), {
		ctrl: props.ctrl,
		props,
	})

	return useAdapter(adapter, props)
}
