import { MenuGroupDescriptor, TItemGroupExtension } from '@soldy-ui/setup'
import { createSolidAdapterContext, useAdapter, useElevator } from '../../../adapter'
import type { MenuGroupProps } from './base.component'

export function setupMenuGroup(props: MenuGroupProps) {
	const { elevator, layer } = useElevator()
	const adapter = createSolidAdapterContext(MenuGroupDescriptor(), {
		ctrl: props.ctrl,
		props,
	}).use(TItemGroupExtension, { elevator })

	return { ...useAdapter(adapter, props), layer }
}
