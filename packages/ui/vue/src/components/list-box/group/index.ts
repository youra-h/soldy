import type { TClosedComponent } from '../../../adapter'
import ListBoxGroupComponent from './Group.vue'

export * from './base.component'
export { default as BaseListBoxGroup } from './base.component'

export const ListBoxGroup: TClosedComponent<typeof ListBoxGroupComponent> = ListBoxGroupComponent
