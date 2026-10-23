import { StylableDescriptor } from '@soldy-ui/setup'
import { useComponent } from '../../adapter'
import type { StylableProps } from './base.component'

export function useSetupStylable(props: StylableProps) {
	return useComponent(
		(create) => create(StylableDescriptor(), { ctrl: props.ctrl, props }),
		props,
	)
}
