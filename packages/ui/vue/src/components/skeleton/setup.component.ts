import { toRaw } from 'vue'
import { createAdapterContext, SkeletonDescriptor } from '@soldy/setup'
import { useAdapter } from '../../adapter'
import BaseSkeleton, { type SkeletonProps } from './base.component'
import { type ISkeletonProps, type ISkeleton } from '@soldy/core'

export default {
	name: '_Skeleton',
	extends: BaseSkeleton,
	setup(props: SkeletonProps, { emit }: any) {
		const adapter = createAdapterContext(SkeletonDescriptor(), {
			ctrl: toRaw(props.ctrl),
			props,
		})

		return useAdapter<ISkeletonProps, ISkeleton>(adapter, props, emit)
	},
}
