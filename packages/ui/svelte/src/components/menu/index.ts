/**
 * Menu — меню действий у кнопки и контекстное меню на базе TMenu и коллекции меню.
 */

import { withParts } from '@soldy-ui/setup'
import MenuComponent from './Menu.svelte'
import { MenuItem } from './item'
import { MenuCheckboxItem } from './checkbox-item'
import { MenuRadioItem } from './radio-item'
import { MenuSubmenu } from './submenu'
import { MenuPopoverItem } from './popover-item'
import { MenuGroup } from './group'
import { MenuRadioGroup } from './radio-group'
import { MenuSeparator } from './separator'

export * from './base.component'
export { setupMenu } from './setup.component'
export * from './item'
export * from './checkbox-item'
export * from './radio-item'
export * from './submenu'
export * from './popover-item'
export * from './group'
export * from './radio-group'
export * from './separator'

/**
 * Основная форма — `<Menu.Item>`, `<Menu.CheckboxItem>`, `<Menu.RadioGroup>` с
 * `<Menu.RadioItem>`, `<Menu.Submenu>`, `<Menu.PopoverItem>`, `<Menu.Group>` и
 * `<Menu.Separator>`; плоские `MenuItem` и соседи работают так же.
 */
export const Menu = withParts(MenuComponent, {
	Item: MenuItem,
	CheckboxItem: MenuCheckboxItem,
	RadioItem: MenuRadioItem,
	Submenu: MenuSubmenu,
	PopoverItem: MenuPopoverItem,
	Group: MenuGroup,
	RadioGroup: MenuRadioGroup,
	Separator: MenuSeparator,
})
