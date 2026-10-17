import { withParts } from '@soldy-ui/setup'
import type { TClosedComponent } from '../../adapter'
import MenuComponent from './Menu.vue'
import { MenuItem } from './item'
import { MenuCheckboxItem } from './checkbox-item'
import { MenuGroup } from './group'
import { MenuSeparator } from './separator'

export { default as BaseMenu } from './base.component'
export * from './base.component'
export * from './item'
export * from './checkbox-item'
export * from './group'
export * from './separator'

/** Экземпляр владельца закрыт так же, как у частей (`TClosedComponent`). */
const MenuOwner: TClosedComponent<typeof MenuComponent> = MenuComponent

/**
 * Основная форма — `<Menu.Item>`, `<Menu.CheckboxItem>`, `<Menu.Group>` и
 * `<Menu.Separator>`; плоские `MenuItem` и соседи работают так же.
 */
export const Menu = withParts(MenuOwner, {
	Item: MenuItem,
	CheckboxItem: MenuCheckboxItem,
	Group: MenuGroup,
	Separator: MenuSeparator,
})
