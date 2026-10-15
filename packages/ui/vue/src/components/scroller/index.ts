import type { TClosedComponent } from '../../adapter'
import ScrollerComponent from './Scroller.vue'

export { default as BaseScroller, emitsScroller, propsScroller } from './base.component'

export const Scroller: TClosedComponent<typeof ScrollerComponent> = ScrollerComponent
