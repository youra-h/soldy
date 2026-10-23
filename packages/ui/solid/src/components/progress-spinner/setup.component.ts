import { ProgressSpinnerDescriptor } from '@soldy-ui/setup'
import { createSolidAdapterContext, useAdapter } from '../../adapter'
import type { ProgressSpinnerProps } from './base.component'

export function setupProgressSpinner(props: ProgressSpinnerProps) {
	const adapter = createSolidAdapterContext(ProgressSpinnerDescriptor(), {
		ctrl: props.ctrl,
		props,
	})

	return useAdapter(adapter, props)
}
