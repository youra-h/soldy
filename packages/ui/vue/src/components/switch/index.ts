import type { TClosedComponent } from '../../adapter'
import SwitchComponent from './Switch.vue'

export { default as BaseSwitch, emitsSwitch, propsSwitch } from './base.component'

export const Switch: TClosedComponent<typeof SwitchComponent> = SwitchComponent
