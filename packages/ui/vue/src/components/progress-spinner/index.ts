import type { TClosedComponent } from '../../adapter'
import ProgressSpinnerComponent from './ProgressSpinner.vue'

export {
	default as BaseProgressSpinner,
	emitsProgressSpinner,
	propsProgressSpinner,
} from './base.component'

export const ProgressSpinner: TClosedComponent<typeof ProgressSpinnerComponent> =
	ProgressSpinnerComponent
