import type { TClosedComponent } from '../../adapter'
import CheckBoxComponent from './CheckBox.vue'

export { default as BaseCheckBox, emitsCheckBox, propsCheckBox } from './base.component'

export const CheckBox: TClosedComponent<typeof CheckBoxComponent> = CheckBoxComponent
