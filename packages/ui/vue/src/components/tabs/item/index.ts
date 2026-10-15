import type { TClosedComponent } from '../../../adapter'
import TabsItemComponent from './Item.vue'

export * from './base.component'
export { default as BaseTabsItem } from './base.component'

export const TabsItem: TClosedComponent<typeof TabsItemComponent> = TabsItemComponent
