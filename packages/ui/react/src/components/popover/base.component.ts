import type { IPopover } from '@soldy-ui/core'
import type { PopoverDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../types'

export type PopoverEventProps = EventProps<typeof PopoverDescriptor>

/** Пропсы Popover: атрибуты — корню, обёртке триггера. */
export type PopoverProps = UseDomProps<typeof PopoverDescriptor, IPopover, PopoverEventProps>
