import type { TClosedComponent } from '../../adapter'
import ComponentViewComponent from './ComponentView.vue'

export {
	default as BaseComponentView,
	emitsComponentView,
	propsComponentView,
} from './base.component'
export * from '../component'

export const ComponentView: TClosedComponent<typeof ComponentViewComponent> = ComponentViewComponent
