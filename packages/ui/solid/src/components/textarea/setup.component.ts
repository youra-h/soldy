import { TextareaDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import { createSolidAdapterContext, useAdapter, useElevator } from '../../adapter'
import type { TextareaProps } from './base.component'

export function setupTextarea(props: TextareaProps) {
	const { elevator } = useElevator()
	const adapter = createSolidAdapterContext(TextareaDescriptor(), {
		ctrl: props.ctrl,
		props,
	}).use(TFieldControlExtension, { elevator })

	return useAdapter(adapter, props)
}
