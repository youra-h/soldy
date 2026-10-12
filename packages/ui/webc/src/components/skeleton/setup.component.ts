/**
 * setupSkeleton — setup-слой Skeleton.
 *
 * Собирает компонент (`createWebcAdapterContext` — с локалью ближайшего
 * `<so-locale-provider>` вверх от элемента) и связывает его с элементом через
 * useAdapter. Логики здесь нет: размер плагин раскладки отдаёт выходом
 * `layout_styles`, и на корень его кладёт база элемента; показана ли заглушка
 * (`present`), считает ядро.
 */

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
