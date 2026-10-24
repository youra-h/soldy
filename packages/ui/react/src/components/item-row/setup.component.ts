import { ItemRowDescriptor } from '@soldy-ui/setup'
import { useComponent } from '../../adapter'
import type { ButtonProps } from '../button/base.component'

export function useSetupItemRow(props: ButtonProps) {
	return useComponent((create) => create(ItemRowDescriptor(), { ctrl: props.ctrl, props }), props)
}
