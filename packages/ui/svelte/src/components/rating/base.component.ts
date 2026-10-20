import type { IRating } from '@soldy-ui/core'
import type { RatingDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../types'

/** События слоя Rating (core + плагины), выведены из дескриптора автоматически. */
export type RatingEventProps = EventProps<typeof RatingDescriptor>

/**
 * Пропсы Rating. Атрибуты — корня, а не поля: указатель поле не ловит, и
 * обработчик нажатия потребителя на нём не сработал бы никогда.
 */
export type RatingProps = UseDomProps<typeof RatingDescriptor, IRating, RatingEventProps>
