import type { TClosedComponent } from '../../adapter'
import PopoverComponent from './Popover.vue'

export { default as BasePopover, emitsPopover, propsPopover } from './base.component'

export const Popover: TClosedComponent<typeof PopoverComponent> = PopoverComponent
