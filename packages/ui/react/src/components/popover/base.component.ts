import type { IPopover } from '@soldy-ui/core'
import type { PopoverDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../types'

/** События Popover (core + плагины), выведены из дескриптора автоматически. */
export type PopoverEventProps = EventProps<typeof PopoverDescriptor>

/**
 * Пропсы Popover. Атрибуты — корня, обёртки триггера; панель — Frame, и её
 * наборы ведёт ядро.
 */
export type PopoverProps = UseDomProps<typeof PopoverDescriptor, IPopover, PopoverEventProps>
