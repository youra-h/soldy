/**
 * setupSkeleton — setup-слой Skeleton.
 *
 * Создаёт adapter-context (`createSolidAdapterContext`) и связывает его с
 * Solid через useAdapter. Тело компонента Solid выполняется один раз,
 * поэтому контекст достаточно положить в обычную константу — useRef-обвязки,
 * как в React, не нужно.
 */

import { SkeletonDescriptor } from '@soldy-ui/setup'
import { createSolidAdapterContext, useAdapter } from '../../adapter'
import type { SkeletonProps } from './base.component'

export function setupSkeleton(props: SkeletonProps) {
	const adapter = createSolidAdapterContext(SkeletonDescriptor(), { ctrl: props.ctrl, props })

	// Выход `layout_styles` разметка кладёт в стиль корня
	return useAdapter(adapter, props)
}
