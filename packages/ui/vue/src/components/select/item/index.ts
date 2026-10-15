import type { TClosedComponent } from '../../../adapter'
import SelectItemComponent from './Item.vue'

export * from './base.component'
export { default as BaseSelectItem } from './base.component'

export const SelectItem: TClosedComponent<typeof SelectItemComponent> = SelectItemComponent
