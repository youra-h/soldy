import type { IRating } from '@soldy-ui/core'
import type { RatingDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../types'

/** События слоя Rating (core + плагины), выведены из дескриптора автоматически. */
export type RatingEventProps = EventProps<typeof RatingDescriptor>

/** Атрибуты потребителя — корню: указатель поле не ловит, и обработчик на поле не сработал бы. */
export type RatingProps = UseDomProps<typeof RatingDescriptor, IRating, RatingEventProps>
