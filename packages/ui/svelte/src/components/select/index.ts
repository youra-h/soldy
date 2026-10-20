/**
 * Select — поле выбора из списка на базе TSelect и коллекции Select.
 */

import { withParts } from '@soldy-ui/setup'
import SelectComponent from './Select.svelte'
import { SelectItem } from './item'
import { SelectGroup } from './group'

export * from './base.component'
export { setupSelect } from './setup.component'
export * from './item'
export * from './group'

/**
 * Основная форма — `<Select.Item>` и `<Select.Group>`; плоские `SelectItem` и
 * `SelectGroup` работают так же.
 */
export const Select = withParts(SelectComponent, { Item: SelectItem, Group: SelectGroup })
