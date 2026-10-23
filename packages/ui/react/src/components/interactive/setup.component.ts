import { InteractiveDescriptor } from '@soldy-ui/setup'
import { useComponent } from '../../adapter'
import type { InteractiveProps } from './base.component'

export function useSetupInteractive(props: InteractiveProps) {
	return useComponent(
		(create) => create(InteractiveDescriptor(), { ctrl: props.ctrl, props }),
		props,
	)
}
