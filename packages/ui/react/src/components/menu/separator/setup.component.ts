import { MenuSeparatorDescriptor } from '@soldy-ui/setup'
import { useComponent } from '../../../adapter'
import type { MenuSeparatorProps } from './base.component'

export function useSetupMenuSeparator(props: MenuSeparatorProps) {
	return useComponent(
		(create) => create(MenuSeparatorDescriptor(), { ctrl: props.ctrl, props }),
		props,
	)
}
