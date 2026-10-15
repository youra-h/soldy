import type { TClosedComponent } from '../../../adapter'
import ListBoxItemComponent from './Item.vue'

export * from './base.component'
export { default as BaseListBoxItem } from './base.component'

export const ListBoxItem: TClosedComponent<typeof ListBoxItemComponent> = ListBoxItemComponent
