/**
 * setupFrame — setup-слой Frame.
 *
 * Собирает компонент (`createWebcAdapterContext` — с локалью ближайшего
 * `<so-locale-provider>` вверх от элемента; у панели, увезённой в цель, поиск
 * идёт от её якоря) и связывает его с элементом через useAdapter. Логики здесь
 * нет: место и размер (`position`, координаты, `z-index` слоя) плагин
 * раскладки отдаёт выходом `layout_styles`, номер слоя и открытость — ядро в
 * `dataset`, а на корень их кладёт база элемента. Она же уводит корень в цель
 * `target`.
 */

import { FrameDescriptor } from '@soldy-ui/setup'
import type { IFrame } from '@soldy-ui/core'
import { createWebcAdapterContext, useAdapter } from '../../adapter'
import type { TBinding, TUpdateListener } from '../../adapter'

export function setupFrame(
	host: HTMLElement,
	ctrl: IFrame | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<IFrame> {
	const adapter = createWebcAdapterContext(host, FrameDescriptor(), { ctrl, props })

	return useAdapter(adapter, host, onUpdate)
}
