import { DialogDescriptor } from '@soldy-ui/setup'
import { useComponent } from '../../adapter'
import type { DialogProps } from './base.component'

export function useSetupDialog(props: DialogProps) {
	return useComponent((create) => create(DialogDescriptor(), { ctrl: props.ctrl, props }), props)
}
