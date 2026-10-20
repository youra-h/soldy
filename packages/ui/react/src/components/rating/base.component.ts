import type { IRating } from '@soldy-ui/core'
import type { RatingDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../types'

/** События слоя Rating (core + плагины), выведены из дескриптора автоматически. */
export type RatingEventProps = EventProps<typeof RatingDescriptor>

/**
 * Пропсы Rating. Атрибуты — корня: указатель поле не ловит, и обработчик
 * потребителя на нём не сработал бы, поэтому делёжа атрибутов между корнем и
 * полем, как у CheckBox, нет.
 */
export type RatingProps = UseDomProps<typeof RatingDescriptor, IRating, RatingEventProps>
