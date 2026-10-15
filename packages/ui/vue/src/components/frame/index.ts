import type { TClosedComponent } from '../../adapter'
import FrameComponent from './Frame.vue'

export { default as BaseFrame, emitsFrame, propsFrame } from './base.component'

export const Frame: TClosedComponent<typeof FrameComponent> = FrameComponent
