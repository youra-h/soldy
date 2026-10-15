import type { TClosedComponent } from '../../adapter'
import LabelComponent from './Label.vue'

export { default as BaseLabel, emitsLabel, propsLabel } from './base.component'

export const Label: TClosedComponent<typeof LabelComponent> = LabelComponent
