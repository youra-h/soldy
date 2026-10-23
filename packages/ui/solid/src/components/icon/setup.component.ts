import { IconDescriptor } from '@soldy-ui/setup'
import { createSolidAdapterContext, useAdapter } from '../../adapter'
import type { IconProps } from './base.component'

export function setupIcon(props: IconProps) {
	const adapter = createSolidAdapterContext(IconDescriptor(), { ctrl: props.ctrl, props })

	return useAdapter(adapter, props)
}
