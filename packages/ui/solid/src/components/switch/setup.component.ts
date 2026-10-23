import { SwitchDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import { createSolidAdapterContext, useAdapter, useElevator } from '../../adapter'
import type { SwitchProps } from './base.component'

export function setupSwitch(props: SwitchProps) {
	const { elevator, layer } = useElevator()
	const adapter = createSolidAdapterContext(SwitchDescriptor(), {
		ctrl: props.ctrl,
		props,
	}).use(TFieldControlExtension, { elevator })

	return { ...useAdapter(adapter, props), layer }
}
