import { BaseStylable } from '../stylable'
import { useEmits, useProps } from '../../adapter'
import type { TEmits, TProps, UseProps } from '../../types/common'
import { SkeletonDescriptor } from '@soldy/setup'
import type { ISkeleton } from '@soldy/core'

export const emitsSkeleton: TEmits = useEmits(SkeletonDescriptor()) as unknown as TEmits

export const propsSkeleton: TProps = useProps(SkeletonDescriptor()) as TProps

export type SkeletonProps = UseProps<typeof SkeletonDescriptor, ISkeleton>

export default {
	name: 'BaseSkeleton',
	emits: emitsSkeleton,
	props: propsSkeleton,
}
