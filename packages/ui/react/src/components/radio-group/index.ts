/**
 * RadioGroup — группа радио на базе TRadioGroup и коллекции RadioGroup.
 */

import { withParts } from '@soldy-ui/setup'
import { RadioGroup as RadioGroupComponent } from './RadioGroup'
import { RadioGroupItem } from './item'

// 1. Base (типы и пропсы)
export * from './base.component'

// 2. Setup (логика и хуки)
export { useSetupRadioGroup } from './setup.component'

// 3. Части
export * from './item'

/** Основная форма — `<RadioGroup.Item>`; плоский `RadioGroupItem` работает так же. */
export const RadioGroup = withParts(RadioGroupComponent, { Item: RadioGroupItem })
