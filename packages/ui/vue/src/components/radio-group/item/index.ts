import type { TClosedComponent } from '../../../adapter'
import RadioGroupItemComponent from './Item.vue'

export * from './base.component'
export { default as BaseRadioGroupItem } from './base.component'

export const RadioGroupItem: TClosedComponent<typeof RadioGroupItemComponent> =
	RadioGroupItemComponent
