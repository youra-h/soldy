import type { IScroller } from '@soldy-ui/core'
import type { ScrollerDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../types'

/** События слоя Scroller (core + плагины), выведены из дескриптора автоматически. */
export type ScrollerEventProps = EventProps<typeof ScrollerDescriptor>

/**
 * Пропсы Scroller. Атрибуты потребителя — корня, как у Vue: роль ряда и всё,
 * что к ней прилагается, вьюпорт получает пропом `viewportAria`.
 */
export type ScrollerProps = UseDomProps<typeof ScrollerDescriptor, IScroller, ScrollerEventProps>
