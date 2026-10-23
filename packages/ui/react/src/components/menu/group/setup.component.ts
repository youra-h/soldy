import { MenuGroupDescriptor, TItemGroupExtension } from '@soldy-ui/setup'
import { useComponent } from '../../../adapter'
import type { MenuGroupProps } from './base.component'

export function useSetupMenuGroup(props: MenuGroupProps) {
	return useComponent(
		(create, elevator) =>
			create(MenuGroupDescriptor(), { ctrl: props.ctrl, props }).use(TItemGroupExtension, {
				elevator,
			}),
		props,
	)
}
