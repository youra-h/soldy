import type { TClosedComponent } from '../../adapter'
import TooltipComponent from './Tooltip.vue'

export { default as BaseTooltip, emitsTooltip, propsTooltip } from './base.component'

export const Tooltip: TClosedComponent<typeof TooltipComponent> = TooltipComponent
