import type { TClosedComponent } from '../../adapter'
import FieldComponent from './Field.vue'

export { default as BaseField, emitsField, propsField } from './base.component'

export const Field: TClosedComponent<typeof FieldComponent> = FieldComponent
