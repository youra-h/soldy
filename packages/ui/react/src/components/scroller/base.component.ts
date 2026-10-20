import type { IScroller } from '@soldy-ui/core'
import type { ScrollerDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../types'

/** События слоя Scroller (core + плагины), выведены из дескриптора автоматически. */
export type ScrollerEventProps = EventProps<typeof ScrollerDescriptor>

/**
 * Пропсы Scroller. Атрибуты — корня, ряда из кнопок и вьюпорта; роль ряда и
 * то, что к ней прилагается, вьюпорту отдаёт проп `viewportAria`.
 */
export type ScrollerProps = UseDomProps<typeof ScrollerDescriptor, IScroller, ScrollerEventProps>
