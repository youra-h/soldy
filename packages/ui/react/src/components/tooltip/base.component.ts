import type { ITooltip } from '@soldy-ui/core'
import type { TooltipDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../types'

export type TooltipEventProps = EventProps<typeof TooltipDescriptor>

/** Пропсы Tooltip: атрибуты — корню, обёртке триггера. */
export type TooltipProps = UseDomProps<typeof TooltipDescriptor, ITooltip, TooltipEventProps>
