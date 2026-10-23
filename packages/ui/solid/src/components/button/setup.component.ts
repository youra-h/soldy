import { ButtonDescriptor } from '@soldy-ui/setup'
import { createSolidAdapterContext, useAdapter } from '../../adapter'
import type { ButtonProps } from './base.component'

export function setupButton(props: ButtonProps) {
	const adapter = createSolidAdapterContext(ButtonDescriptor(), { ctrl: props.ctrl, props })

	return useAdapter(adapter, props)
}
