import type { ITooltip } from '@soldy-ui/core'
import type { TooltipDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../types'

/** События Tooltip (core + плагины), выведены из дескриптора автоматически. */
export type TooltipEventProps = EventProps<typeof TooltipDescriptor>

/**
 * Пропсы Tooltip. Атрибуты — корня, обёртки триггера; панель — Frame, и её
 * наборы ведёт ядро.
 */
export type TooltipProps = UseDomProps<typeof TooltipDescriptor, ITooltip, TooltipEventProps>
