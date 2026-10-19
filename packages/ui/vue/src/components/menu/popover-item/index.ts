import type { TClosedComponent } from '../../../adapter'
import MenuPopoverItemComponent from './PopoverItem.vue'

export * from './base.component'
export { default as BaseMenuPopoverItem } from './base.component'

export const MenuPopoverItem: TClosedComponent<typeof MenuPopoverItemComponent> =
	MenuPopoverItemComponent
