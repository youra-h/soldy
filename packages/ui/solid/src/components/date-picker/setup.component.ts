import { DatePickerDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import { createSolidAdapterContext, useAdapter, useElevator } from '../../adapter'
import type { DatePickerProps } from './base.component'

/**
 * DatePicker takes the `Field` link for itself and lowers an empty one to its
 * content. A mode's fields the markup reads from the instance in that mode's
 * branch: the core creates a field when its mode needs it.
 */
export function setupDatePicker(props: DatePickerProps) {
	const { elevator, layer } = useElevator()
	const adapter = createSolidAdapterContext(DatePickerDescriptor(), {
		ctrl: props.ctrl,
		props,
	}).use(TFieldControlExtension, { elevator })
	const picker = adapter.instance

	return {
		...useAdapter(adapter, props),
		layer,
		calendar: picker.calendar,
		engine: picker.engine,
	}
}
