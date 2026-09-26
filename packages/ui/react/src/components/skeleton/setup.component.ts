/**
 * useSetupSkeleton — setup-слой Skeleton (аналог setup.component.ts во Vue).
 *
 * Создаёт adapter-context сборкой useAdapterContext — create(SkeletonDescriptor(), ...)
 * и связывает его с React Runtime через useAdapter.
 */

import { SkeletonDescriptor } from '@soldy-ui/setup'
import { useAdapter, useAdapterContext } from '../../adapter'
import type { SkeletonProps } from './base.component'

export function useSetupSkeleton(props: SkeletonProps) {
	const adapter = useAdapterContext((create) =>
		create(SkeletonDescriptor(), { ctrl: props.ctrl, props }),
	)

	// Выход `layout_styles` разметка кладёт в `style` корня
	return useAdapter(adapter, props)
}
