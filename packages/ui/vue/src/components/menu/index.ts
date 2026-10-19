import { withParts } from '@soldy-ui/setup'
import type { TClosedComponent } from '../../adapter'
import MenuComponent from './Menu.vue'
import { MenuItem } from './item'
import { MenuCheckboxItem } from './checkbox-item'
import { MenuSubmenu } from './submenu'
import { MenuPopoverItem } from './popover-item'
import { MenuGroup } from './group'
import { MenuSeparator } from './separator'

export { default as BaseMenu } from './base.component'
export * from './base.component'
export * from './item'
export * from './checkbox-item'
export * from './submenu'
export * from './popover-item'
export * from './group'
export * from './separator'

/** Экземпляр владельца закрыт так же, как у частей (`TClosedComponent`). */
const MenuOwner: TClosedComponent<typeof MenuComponent> = MenuComponent

/**
 * Основная форма — `<Menu.Item>`, `<Menu.CheckboxItem>`, `<Menu.Submenu>`,
 * `<Menu.PopoverItem>`, `<Menu.Group>` и `<Menu.Separator>`; плоские
 * `MenuItem` и соседи работают так же.
 */
export const Menu = withParts(MenuOwner, {
	Item: MenuItem,
	CheckboxItem: MenuCheckboxItem,
	Submenu: MenuSubmenu,
	PopoverItem: MenuPopoverItem,
	Group: MenuGroup,
	Separator: MenuSeparator,
})
