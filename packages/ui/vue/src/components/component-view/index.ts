export {
	default as BaseComponentView,
	emitsComponentView,
	propsComponentView,
} from './base.component'
export { default as ComponentView } from './ComponentView.vue'
export * from '../component'

// Старый deprecated код — см. _base.component.ts
export type { IComponentViewState } from './_base.component'
export { syncComponentView } from './_base.component'
