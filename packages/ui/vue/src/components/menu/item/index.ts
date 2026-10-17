import type { TClosedComponent } from '../../../adapter'
import MenuItemComponent from './Item.vue'

export * from './base.component'
export { default as BaseMenuItem } from './base.component'

export const MenuItem: TClosedComponent<typeof MenuItemComponent> = MenuItemComponent
