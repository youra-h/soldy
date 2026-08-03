import { toRaw } from 'vue'
import { createAdapterContext, SkeletonDescriptor } from '@soldy/setup'
import { useVue } from '../../adapter'
import BaseSkeleton from './base.component'
import type { TBaseComponentProps } from '../../types'
import { type ISkeletonProps, type ISkeleton } from '@soldy/core'

export default {
	name: '_Skeleton',
	extends: BaseSkeleton,
	setup(props: TBaseComponentProps<ISkeletonProps, ISkeleton>, { emit }: any) {
		const adapter = createAdapterContext(SkeletonDescriptor, {
			ctrl: props.ctrl ? toRaw(props.ctrl) : undefined,
			props,
		})

		return useVue<ISkeletonProps, ISkeleton>(adapter, props, emit)
	},
}
