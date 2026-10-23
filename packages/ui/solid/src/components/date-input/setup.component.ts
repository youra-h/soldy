import { DateInputDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import { createSolidAdapterContext, useAdapter, useElevator } from '../../adapter'
import type { DateInputProps } from './base.component'

/** Связку `Field` над полем берёт `TFieldControlExtension`, содержимому — пустую. */
export function setupDateInput(props: DateInputProps) {
	const { elevator, layer } = useElevator()
	const adapter = createSolidAdapterContext(DateInputDescriptor(), {
		ctrl: props.ctrl,
		props,
	}).use(TFieldControlExtension, { elevator })

	return { ...useAdapter(adapter, props), layer }
}
