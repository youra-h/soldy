import type { TClosedComponent } from '../../adapter'
import IconComponent from './Icon.vue'

export { default as BaseIcon, emitsIcon } from './base.component'

export const Icon: TClosedComponent<typeof IconComponent> = IconComponent
