import type { TClosedComponent } from '../../adapter'
import SkeletonComponent from './Skeleton.vue'

export { default as BaseSkeleton, emitsSkeleton, propsSkeleton } from './base.component'

export const Skeleton: TClosedComponent<typeof SkeletonComponent> = SkeletonComponent
