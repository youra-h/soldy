import { SkeletonDescriptor } from '@soldy-ui/setup'
import { useComponent } from '../../adapter'
import type { SkeletonProps } from './base.component'

export function useSetupSkeleton(props: SkeletonProps) {
	return useComponent(
		(create) => create(SkeletonDescriptor(), { ctrl: props.ctrl, props }),
		props,
	)
}
