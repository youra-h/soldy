import { withParts } from '@soldy-ui/setup'
import type { TClosedComponent } from '../../adapter'
import SelectComponent from './Select.vue'
import { SelectItem } from './item'

export { default as BaseSelect } from './base.component'
export * from './base.component'
export * from './item'

/**
 * Основная форма — `<Select.Item>`; плоский `SelectItem` работает так же.
 * Экземпляр владельца закрыт так же, как у части (`TClosedComponent`).
 */
export const Select: TClosedComponent<typeof SelectComponent> & { Item: typeof SelectItem } =
	withParts(SelectComponent, { Item: SelectItem })
