import { withParts } from '@soldy-ui/setup'
import type { TClosedComponent } from '../../adapter'
import SelectComponent from './Select.vue'
import { SelectItem } from './item'
import { SelectGroup } from './group'

export { default as BaseSelect } from './base.component'
export * from './base.component'
export * from './item'
export * from './group'

/**
 * Основная форма — `<Select.Item>` и `<Select.Group>`; плоские `SelectItem` и
 * `SelectGroup` работают так же. Экземпляр владельца закрыт так же, как у
 * частей (`TClosedComponent`).
 */
export const Select: TClosedComponent<typeof SelectComponent> & {
	Item: typeof SelectItem
	Group: typeof SelectGroup
} = withParts(SelectComponent, { Item: SelectItem, Group: SelectGroup })
