import { ProgressSpinnerDescriptor } from '@soldy-ui/setup'
import { useComponent } from '../../adapter'
import type { ProgressSpinnerProps } from './base.component'

export function useSetupProgressSpinner(props: ProgressSpinnerProps) {
	return useComponent(
		(create) => create(ProgressSpinnerDescriptor(), { ctrl: props.ctrl, props }),
		props,
	)
}
