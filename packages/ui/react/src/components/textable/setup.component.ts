import { TextableDescriptor } from '@soldy-ui/setup'
import { useComponent } from '../../adapter'
import type { TextableProps } from './base.component'

export function useSetupTextable(props: TextableProps) {
	return useComponent(
		(create) => create(TextableDescriptor(), { ctrl: props.ctrl, props }),
		props,
	)
}
