import { BaseStylable } from '../stylable'
import { useEmits, useProps } from '../../adapter'
import type { TEmits, TProps } from '../../types/common'
import { SkeletonDescriptor } from '@soldy/setup'

export const emitsSkeleton: TEmits = useEmits(SkeletonDescriptor) as unknown as TEmits

export const propsSkeleton: TProps = useProps(SkeletonDescriptor) as TProps

export default {
	name: 'BaseSkeleton',
	extends: BaseStylable,
	emits: emitsSkeleton,
	props: propsSkeleton,
}
