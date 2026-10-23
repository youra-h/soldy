import { withParts } from '@soldy-ui/setup'
import { Menu as MenuComponent } from './Menu'
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
