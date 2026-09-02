import { useAdapter } from '../../adapter'
import { SkeletonDescriptor } from '@soldy/setup'
import BaseSkeleton from './base.component'
import type { TBaseComponentProps } from '../../types'
import { type ISkeletonProps, type ISkeleton } from '@soldy/core'

export default {
	name: '_Skeleton',
	extends: BaseSkeleton,
	setup(props: TBaseComponentProps<ISkeletonProps, ISkeleton>, { emit }: any) {
		return useAdapter(SkeletonDescriptor, props, emit)
	},
}
