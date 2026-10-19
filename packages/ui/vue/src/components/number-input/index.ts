import type { TClosedComponent } from '../../adapter'
import NumberInputComponent from './NumberInput.vue'

export { default as BaseNumberInput, emitsNumberInput, propsNumberInput } from './base.component'

export const NumberInput: TClosedComponent<typeof NumberInputComponent> = NumberInputComponent
