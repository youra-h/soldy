import { withParts } from '@soldy-ui/setup'
import type { TClosedComponent } from '../../adapter'
import RadioGroupComponent from './RadioGroup.vue'
import { RadioGroupItem } from './item'

export { default as BaseRadioGroup } from './base.component'
export * from './base.component'
export * from './item'

/** Экземпляр владельца закрыт так же, как у частей (`TClosedComponent`). */
const RadioGroupOwner: TClosedComponent<typeof RadioGroupComponent> = RadioGroupComponent

/** Основная форма — `<RadioGroup.Item>`; плоский `RadioGroupItem` работает так же. */
export const RadioGroup = withParts(RadioGroupOwner, { Item: RadioGroupItem })
