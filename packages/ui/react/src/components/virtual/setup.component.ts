import { TVirtualExtension, VirtualDescriptor } from '@soldy-ui/setup'
import { useComponent } from '../../adapter'
import type { VirtualProps } from './base.component'

export function useSetupVirtual(props: VirtualProps) {
	return useComponent(
		(create, elevator) =>
			create(VirtualDescriptor(), { ctrl: props.ctrl, props }).use(TVirtualExtension, {
				elevator,
			}),
		props,
	)
}
