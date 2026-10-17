import type { TClosedComponent } from '../../../adapter'
import MenuCheckboxItemComponent from './CheckboxItem.vue'

export * from './base.component'
export { default as BaseMenuCheckboxItem } from './base.component'

export const MenuCheckboxItem: TClosedComponent<typeof MenuCheckboxItemComponent> =
	MenuCheckboxItemComponent
