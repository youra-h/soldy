import { SkeletonDescriptor } from '@soldy-ui/setup'
import type { ISkeleton } from '@soldy-ui/core'
import { createWebcAdapterContext, useAdapter } from '../../adapter'
import type { TBinding, TUpdateListener } from '../../adapter'

export function setupSkeleton(
	host: HTMLElement,
	ctrl: ISkeleton | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<ISkeleton> {
	const adapter = createWebcAdapterContext(host, SkeletonDescriptor(), { ctrl, props })

	return useAdapter(adapter, host, onUpdate)
}
