import type { IScroller } from '@soldy-ui/core'
import type { ScrollerDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../types'

export type ScrollerEventProps = EventProps<typeof ScrollerDescriptor>

/** Пропсы Scroller: атрибуты — корню, роль ряда вьюпорту — `viewportAria`. */
export type ScrollerProps = UseDomProps<typeof ScrollerDescriptor, IScroller, ScrollerEventProps>
