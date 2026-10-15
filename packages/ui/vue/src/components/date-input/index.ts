import type { TClosedComponent } from '../../adapter'
import DateInputComponent from './DateInput.vue'

export { default as BaseDateInput, emitsDateInput, propsDateInput } from './base.component'

export const DateInput: TClosedComponent<typeof DateInputComponent> = DateInputComponent
