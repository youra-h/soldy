import { SkeletonDescriptor } from '@soldy/setup'
import { useAdapter, createVueAdapterContext, type SetupContext } from '../../adapter'
import BaseSkeleton, { type SkeletonProps } from './base.component'
import { type ISkeletonProps, type ISkeleton } from '@soldy/core'

export default {
	name: '_Skeleton',
	extends: BaseSkeleton,
	setup(props: SkeletonProps, { emit }: SetupContext) {
		const adapter = createVueAdapterContext(SkeletonDescriptor(), {
			ctrl: props.ctrl,
			props,
		})

		return useAdapter<ISkeletonProps, ISkeleton>(adapter, props, emit)
	},
}
