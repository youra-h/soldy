import { LabelDescriptor } from '@soldy-ui/setup'
import { useComponent } from '../../adapter'
import type { LabelProps } from './base.component'

export function useSetupLabel(props: LabelProps) {
	return useComponent((create) => create(LabelDescriptor(), { ctrl: props.ctrl, props }), props)
}
