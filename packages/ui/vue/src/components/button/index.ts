import type { TClosedComponent } from '../../adapter'
import ButtonComponent from './Button.vue'

export { default as BaseButton, emitsButton, propsButton } from './base.component'

export const Button: TClosedComponent<typeof ButtonComponent> = ButtonComponent
