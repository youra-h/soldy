import type { IDatePicker } from '@soldy-ui/core'
import type { DatePickerDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../types'

export type DatePickerEventProps = EventProps<typeof DatePickerDescriptor>

/** Атрибуты — корню: якорю панели и коробке полей диапазона. */
export type DatePickerProps = UseDomProps<
	typeof DatePickerDescriptor,
	IDatePicker,
	DatePickerEventProps
>
