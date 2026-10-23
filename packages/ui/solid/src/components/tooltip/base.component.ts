import type { ITooltip } from '@soldy-ui/core'
import type { TooltipDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../types'

/** События Tooltip (ядро и плагины). */
export type TooltipEventProps = EventProps<typeof TooltipDescriptor>

/** Пропсы Tooltip. Атрибуты — корня, обёртки триггера: ARIA подсказки — у панели. */
export type TooltipProps = UseDomProps<typeof TooltipDescriptor, ITooltip, TooltipEventProps>
