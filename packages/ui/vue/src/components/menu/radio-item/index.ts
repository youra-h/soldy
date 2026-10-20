import type { TClosedComponent } from '../../../adapter'
import MenuRadioItemComponent from './RadioItem.vue'

export * from './base.component'
export { default as BaseMenuRadioItem } from './base.component'

export const MenuRadioItem: TClosedComponent<typeof MenuRadioItemComponent> = MenuRadioItemComponent
