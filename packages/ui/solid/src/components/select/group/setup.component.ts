import { SelectGroupDescriptor, TItemGroupExtension } from '@soldy-ui/setup'
import { createSolidAdapterContext, useAdapter, useElevator } from '../../../adapter'
import type { SelectGroupProps } from './base.component'

export function setupSelectGroup(props: SelectGroupProps) {
	const { elevator, layer } = useElevator()
	const adapter = createSolidAdapterContext(SelectGroupDescriptor(), {
		ctrl: props.ctrl,
		props,
	}).use(TItemGroupExtension, { elevator })

	return { ...useAdapter(adapter, props), layer }
}
