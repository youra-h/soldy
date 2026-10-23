import { CheckBoxDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import { createSolidAdapterContext, useAdapter, useElevator } from '../../adapter'
import type { CheckBoxProps } from './base.component'

export function setupCheckBox(props: CheckBoxProps) {
	const { elevator, layer } = useElevator()
	const adapter = createSolidAdapterContext(CheckBoxDescriptor(), {
		ctrl: props.ctrl,
		props,
	}).use(TFieldControlExtension, { elevator })

	return { ...useAdapter(adapter, props), layer }
}
