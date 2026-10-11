import { SkeletonDescriptor } from '@soldy-ui/setup'
import type { ISkeleton } from '@soldy-ui/core'
import { createAngularAdapterContext, useAdapter } from '../../adapter'
import type { TBinding } from '../../adapter'

/**
 * setupSkeleton — setup-слой Skeleton: собирает компонент
 * (`createAngularAdapterContext`) и связывает его с Angular через useAdapter.
 *
 * Логики здесь нет: размер плагин раскладки отдаёт выходом `layout_styles`, и
 * на корень его кладёт база компонента; показана ли заглушка (`present`),
 * считает ядро.
 */
export function setupSkeleton(ctrl: ISkeleton | undefined, props: object): TBinding<ISkeleton> {
	const adapter = createAngularAdapterContext(SkeletonDescriptor(), { ctrl, props })

	return useAdapter(adapter)
}
