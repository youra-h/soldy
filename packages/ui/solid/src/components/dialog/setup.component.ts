import { DialogDescriptor } from '@soldy-ui/setup'
import { createSolidAdapterContext, useAdapter } from '../../adapter'
import type { DialogProps } from './base.component'

export function setupDialog(props: DialogProps) {
	const adapter = createSolidAdapterContext(DialogDescriptor(), { ctrl: props.ctrl, props })

	return useAdapter(adapter, props)
}
