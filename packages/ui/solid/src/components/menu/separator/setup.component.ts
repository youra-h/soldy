import { MenuSeparatorDescriptor } from '@soldy-ui/setup'
import { createSolidAdapterContext, useAdapter } from '../../../adapter'
import type { MenuSeparatorProps } from './base.component'

export function setupMenuSeparator(props: MenuSeparatorProps) {
	const adapter = createSolidAdapterContext(MenuSeparatorDescriptor(), {
		ctrl: props.ctrl,
		props,
	})

	return useAdapter(adapter, props)
}
