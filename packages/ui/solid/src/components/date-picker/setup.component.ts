import { DatePickerDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import { createSolidAdapterContext, useAdapter, useElevator } from '../../adapter'
import type { DatePickerProps } from './base.component'

/** Связку `Field` DatePicker берёт себе, а своему содержимому опускает пустую. */
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
		field: picker.field,
		start: picker.start,
		end: picker.end,
		calendar: picker.calendar,
		engine: picker.engine,
	}
}
