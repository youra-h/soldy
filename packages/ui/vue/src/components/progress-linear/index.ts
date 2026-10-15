import type { TClosedComponent } from '../../adapter'
import ProgressLinearComponent from './ProgressLinear.vue'

export {
	default as BaseProgressLinear,
	emitsProgressLinear,
	propsProgressLinear,
} from './base.component'

export const ProgressLinear: TClosedComponent<typeof ProgressLinearComponent> =
	ProgressLinearComponent
