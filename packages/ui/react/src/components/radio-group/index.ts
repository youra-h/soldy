import { withParts } from '@soldy-ui/setup'
import { RadioGroup as RadioGroupComponent } from './RadioGroup'
import { RadioGroupItem } from './item'

export * from './base.component'
export * from './item'

/** Основная форма — `<RadioGroup.Item>`; плоский `RadioGroupItem` работает так же. */
export const RadioGroup = withParts(RadioGroupComponent, { Item: RadioGroupItem })
