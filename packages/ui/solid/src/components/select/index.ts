import { withParts } from '@soldy-ui/setup'
import { Select as SelectComponent } from './Select'
import { SelectItem } from './item'
import { SelectGroup } from './group'

export * from './base.component'
export { setupSelect } from './setup.component'
export * from './item'
export * from './group'

export const Select = withParts(SelectComponent, { Item: SelectItem, Group: SelectGroup })
