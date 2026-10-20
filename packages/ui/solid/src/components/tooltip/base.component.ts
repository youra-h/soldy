import type { ITooltip } from '@soldy-ui/core'
import type { TooltipDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../types'

/** События слоя Tooltip (core + плагины), выведены из дескриптора автоматически. */
export type TooltipEventProps = EventProps<typeof TooltipDescriptor>

/**
 * Пропсы Tooltip. Атрибуты потребителя — корня, обёртки триггера, как у Vue:
 * ARIA подсказки — у панели, а ссылку на неё триггер берёт из scope слота
 * `trigger`.
 */
export type TooltipProps = UseDomProps<typeof TooltipDescriptor, ITooltip, TooltipEventProps>
