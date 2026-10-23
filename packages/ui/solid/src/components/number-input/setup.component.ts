import { NumberInputDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import { createSolidAdapterContext, useAdapter, useElevator } from '../../adapter'
import type { NumberInputProps } from './base.component'

export function setupNumberInput(props: NumberInputProps) {
	const { elevator, layer } = useElevator()
	const adapter = createSolidAdapterContext(NumberInputDescriptor(), {
		ctrl: props.ctrl,
		props,
	}).use(TFieldControlExtension, { elevator })

	return { ...useAdapter(adapter, props), layer }
}
