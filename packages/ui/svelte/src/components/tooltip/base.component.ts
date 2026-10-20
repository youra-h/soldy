import type { ITooltip } from '@soldy-ui/core'
import type { TooltipDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../types'

/** События Tooltip (ядро и плагины), выведены из дескриптора автоматически. */
export type TooltipEventProps = EventProps<typeof TooltipDescriptor>

/**
 * Пропсы Tooltip. Атрибуты — корня: обёртки триггера (по умолчанию `span`), а
 * не панели.
 */
export type TooltipProps = UseDomProps<typeof TooltipDescriptor, ITooltip, TooltipEventProps>
