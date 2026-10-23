import type { IRating } from '@soldy-ui/core'
import type { RatingDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../types'

export type RatingEventProps = EventProps<typeof RatingDescriptor>

/** Пропсы Rating: атрибуты — корню целиком, указатель поле не ловит. */
export type RatingProps = UseDomProps<typeof RatingDescriptor, IRating, RatingEventProps>
