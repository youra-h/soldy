import type { TClosedComponent } from '../../../adapter'
import MenuSubmenuComponent from './Submenu.vue'

export * from './base.component'
export { default as BaseMenuSubmenu } from './base.component'

export const MenuSubmenu: TClosedComponent<typeof MenuSubmenuComponent> = MenuSubmenuComponent
