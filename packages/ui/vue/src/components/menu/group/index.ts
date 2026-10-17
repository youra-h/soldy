import type { TClosedComponent } from '../../../adapter'
import MenuGroupComponent from './Group.vue'

export * from './base.component'
export { default as BaseMenuGroup } from './base.component'

export const MenuGroup: TClosedComponent<typeof MenuGroupComponent> = MenuGroupComponent
