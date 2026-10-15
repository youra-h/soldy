import type { TClosedComponent } from '../../adapter'
import InputComponent from './Input.vue'

export { default as BaseInput, emitsInput, propsInput } from './base.component'

export const Input: TClosedComponent<typeof InputComponent> = InputComponent
