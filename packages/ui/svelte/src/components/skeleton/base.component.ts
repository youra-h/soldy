import type { ISkeleton } from '@soldy-ui/core'
import type { SkeletonDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../types'

/** События слоя Skeleton (core + плагины), выведены из дескриптора автоматически. */
export type SkeletonEventProps = EventProps<typeof SkeletonDescriptor>

export type SkeletonProps = UseDomProps<typeof SkeletonDescriptor, ISkeleton, SkeletonEventProps>
