import type { ITooltip } from '@soldy-ui/core'
import type { TooltipDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../types'

export type TooltipEventProps = EventProps<typeof TooltipDescriptor>

/** Атрибуты — обёртке триггера, а не панели. */
export type TooltipProps = UseDomProps<typeof TooltipDescriptor, ITooltip, TooltipEventProps>
