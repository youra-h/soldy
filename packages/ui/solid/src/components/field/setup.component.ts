import { FieldDescriptor, TFieldExtension } from '@soldy-ui/setup'
import { createSolidAdapterContext, useAdapter, useElevator } from '../../adapter'
import type { FieldProps } from './base.component'

export function setupField(props: FieldProps) {
	const { elevator, layer } = useElevator()
	const adapter = createSolidAdapterContext(FieldDescriptor(), {
		ctrl: props.ctrl,
		props,
	}).use(TFieldExtension, { elevator })

	return { ...useAdapter(adapter, props), layer }
}
