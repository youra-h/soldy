import { SkeletonDescriptor } from '@soldy-ui/setup'
import { createSolidAdapterContext, useAdapter } from '../../adapter'
import type { SkeletonProps } from './base.component'

export function setupSkeleton(props: SkeletonProps) {
	const adapter = createSolidAdapterContext(SkeletonDescriptor(), { ctrl: props.ctrl, props })

	return useAdapter(adapter, props)
}
