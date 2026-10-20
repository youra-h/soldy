import type { IPopover } from '@soldy-ui/core'
import type { PopoverDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../types'

/** События Popover (ядро и плагины), выведены из дескриптора автоматически. */
export type PopoverEventProps = EventProps<typeof PopoverDescriptor>

/**
 * Пропсы Popover. Атрибуты — корня: обёртки триггера (по умолчанию `span`), а
 * не панели. Панели ARIA и `data-*` отдаёт сам поповер.
 */
export type PopoverProps = UseDomProps<typeof PopoverDescriptor, IPopover, PopoverEventProps>
