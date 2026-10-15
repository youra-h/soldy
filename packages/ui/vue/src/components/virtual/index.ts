import type { TClosedComponent } from '../../adapter'
import VirtualComponent from './Virtual.vue'

export { default as BaseVirtual, emitsVirtual, propsVirtual } from './base.component'

export const Virtual: TClosedComponent<typeof VirtualComponent> = VirtualComponent
