/**
 * Select — поле выбора из списка на базе TSelect и коллекции Select.
 */

import { withParts } from '@soldy-ui/setup'
import { Select as SelectComponent } from './Select'
import { SelectItem } from './item'
import { SelectGroup } from './group'

// 1. Base (типы и пропсы)
export * from './base.component'

// 2. Setup (логика и хуки)
export { useSetupSelect } from './setup.component'

// 3. Части
export * from './item'
export * from './group'

/**
 * Основная форма — `<Select.Item>` и `<Select.Group>`; плоские `SelectItem` и
 * `SelectGroup` работают так же.
 */
export const Select = withParts(SelectComponent, { Item: SelectItem, Group: SelectGroup })
