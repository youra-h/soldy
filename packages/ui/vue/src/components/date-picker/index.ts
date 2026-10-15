import type { TClosedComponent } from '../../adapter'
import DatePickerComponent from './DatePicker.vue'

export { default as BaseDatePicker, emitsDatePicker, propsDatePicker } from './base.component'
export type { DatePickerProps } from './base.component'

export const DatePicker: TClosedComponent<typeof DatePickerComponent> = DatePickerComponent
