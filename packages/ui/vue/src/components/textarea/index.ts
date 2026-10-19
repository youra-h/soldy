import type { TClosedComponent } from '../../adapter'
import TextareaComponent from './Textarea.vue'

export { default as BaseTextarea, emitsTextarea, propsTextarea } from './base.component'

export const Textarea: TClosedComponent<typeof TextareaComponent> = TextareaComponent
