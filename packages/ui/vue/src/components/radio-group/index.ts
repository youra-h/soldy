import { withParts } from '@soldy-ui/setup'
import RadioGroupComponent from './RadioGroup.vue'
import { RadioGroupItem } from './item'

export { default as BaseRadioGroup } from './base.component'
export * from './base.component'
export * from './item'

/** Основная форма — `<RadioGroup.Item>`; плоский `RadioGroupItem` работает так же. */
export const RadioGroup = withParts(RadioGroupComponent, { Item: RadioGroupItem })
