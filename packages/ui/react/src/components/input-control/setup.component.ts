import { InputControlDescriptor } from '@soldy-ui/setup'
import { useComponent } from '../../adapter'
import type { InputControlProps } from './base.component'

export function useSetupInputControl(props: InputControlProps) {
	return useComponent(
		(create) => create(InputControlDescriptor(), { ctrl: props.ctrl, props }),
		props,
	)
}
