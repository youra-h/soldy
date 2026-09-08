import { withParts } from '@soldy/setup'
import SelectComponent from './Select.vue'
import { SelectItem } from './item'

export { default as BaseSelect } from './base.component'
export * from './base.component'
export * from './item'

/** Основная форма — `<Select.Item>`; плоский `SelectItem` работает так же. */
export const Select = withParts(SelectComponent, { Item: SelectItem })
