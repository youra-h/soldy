import type { TClosedComponent } from '../../../adapter'
import MenuSeparatorComponent from './Separator.vue'

export * from './base.component'
export { default as BaseMenuSeparator } from './base.component'

export const MenuSeparator: TClosedComponent<typeof MenuSeparatorComponent> = MenuSeparatorComponent
