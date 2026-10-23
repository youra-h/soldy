import { InputDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import { createSolidAdapterContext, useAdapter, useElevator } from '../../adapter'
import type { InputProps } from './base.component'

export function setupInput(props: InputProps) {
	const { elevator, layer } = useElevator()
	const adapter = createSolidAdapterContext(InputDescriptor(), {
		ctrl: props.ctrl,
		props,
	}).use(TFieldControlExtension, { elevator })

	return { ...useAdapter(adapter, props), layer }
}
