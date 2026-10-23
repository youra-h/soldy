import { DrawerDescriptor } from '@soldy-ui/setup'
import { useComponent } from '../../adapter'
import type { DrawerProps } from './base.component'

export function useSetupDrawer(props: DrawerProps) {
	return useComponent((create) => create(DrawerDescriptor(), { ctrl: props.ctrl, props }), props)
}
