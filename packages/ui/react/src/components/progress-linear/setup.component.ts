import { ProgressLinearDescriptor } from '@soldy-ui/setup'
import { useComponent } from '../../adapter'
import type { ProgressLinearProps } from './base.component'

export function useSetupProgressLinear(props: ProgressLinearProps) {
	return useComponent(
		(create) => create(ProgressLinearDescriptor(), { ctrl: props.ctrl, props }),
		props,
	)
}
