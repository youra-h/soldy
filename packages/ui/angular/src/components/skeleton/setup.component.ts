import { SkeletonDescriptor } from '@soldy-ui/setup'
import type { ISkeleton } from '@soldy-ui/core'
import { createAngularAdapterContext, useAdapter } from '../../adapter'
import type { TBinding } from '../../adapter'

export function setupSkeleton(ctrl: ISkeleton | undefined, props: object): TBinding<ISkeleton> {
	const adapter = createAngularAdapterContext(SkeletonDescriptor(), { ctrl, props })

	return useAdapter(adapter)
}
