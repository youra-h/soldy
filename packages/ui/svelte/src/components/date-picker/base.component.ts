import type { IDatePicker } from '@soldy-ui/core'
import type { DatePickerDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../types'

/** События слоя DatePicker (core + плагины), выведены из дескриптора автоматически. */
export type DatePickerEventProps = EventProps<typeof DatePickerDescriptor>

/**
 * Пропсы DatePicker. Атрибуты потребителя — корню, как у Vue: он якорь
 * панели и у диапазона — коробка полей концов.
 */
export type DatePickerProps = UseDomProps<
	typeof DatePickerDescriptor,
	IDatePicker,
	DatePickerEventProps
>
