import { DrawerDescriptor } from '@soldy-ui/setup'
import { createSolidAdapterContext, useAdapter } from '../../adapter'
import type { DrawerProps } from './base.component'

export function setupDrawer(props: DrawerProps) {
	const adapter = createSolidAdapterContext(DrawerDescriptor(), { ctrl: props.ctrl, props })

	return useAdapter(adapter, props)
}
