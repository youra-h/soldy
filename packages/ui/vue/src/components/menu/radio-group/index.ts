import type { TClosedComponent } from '../../../adapter'
import MenuRadioGroupComponent from './RadioGroup.vue'

export * from './base.component'
export { default as BaseMenuRadioGroup } from './base.component'

export const MenuRadioGroup: TClosedComponent<typeof MenuRadioGroupComponent> =
	MenuRadioGroupComponent
