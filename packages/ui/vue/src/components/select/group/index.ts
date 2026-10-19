import type { TClosedComponent } from '../../../adapter'
import SelectGroupComponent from './Group.vue'

export * from './base.component'
export { default as BaseSelectGroup } from './base.component'

export const SelectGroup: TClosedComponent<typeof SelectGroupComponent> = SelectGroupComponent
