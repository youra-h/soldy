import type { IPopover } from '@soldy-ui/core'
import type { PopoverDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../types'

/** События слоя Popover (core + плагины), выведены из дескриптора автоматически. */
export type PopoverEventProps = EventProps<typeof PopoverDescriptor>

/**
 * Пропсы Popover. Атрибуты потребителя — корня, обёртки триггера, как у Vue:
 * ARIA поповера — у панели, а связку с ней триггер берёт из scope слота
 * `trigger`.
 */
export type PopoverProps = UseDomProps<typeof PopoverDescriptor, IPopover, PopoverEventProps>
