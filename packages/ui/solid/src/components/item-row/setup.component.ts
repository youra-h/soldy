import { ItemRowDescriptor } from '@soldy-ui/setup'
import { createSolidAdapterContext, useAdapter } from '../../adapter'
import type { ButtonProps } from '../button/base.component'

export function setupItemRow(props: ButtonProps) {
	const adapter = createSolidAdapterContext(ItemRowDescriptor(), { ctrl: props.ctrl, props })

	return useAdapter(adapter, props)
}
