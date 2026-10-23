import { SelectGroupDescriptor, TItemGroupExtension } from '@soldy-ui/setup'
import { useComponent } from '../../../adapter'
import type { SelectGroupProps } from './base.component'

export function useSetupSelectGroup(props: SelectGroupProps) {
	return useComponent(
		(create, elevator) =>
			create(SelectGroupDescriptor(), { ctrl: props.ctrl, props }).use(TItemGroupExtension, {
				elevator,
			}),
		props,
	)
}
