import { FrameDescriptor } from '@soldy-ui/setup'
import type { IFrame } from '@soldy-ui/core'
import { createAngularAdapterContext, useAdapter } from '../../adapter'
import type { TBinding } from '../../adapter'

/**
 * setupFrame — setup-слой Frame: собирает компонент
 * (`createAngularAdapterContext`) и связывает его с Angular через useAdapter.
 *
 * Логики здесь нет: место и размер (`position`, координаты, `z-index` слоя)
 * плагин раскладки отдаёт выходом `layout_styles`, номер слоя и открытость —
 * ядро в `dataset`, а на корень их кладёт база компонента. Она же уводит
 * корень в цель `target`.
 */
export function setupFrame(ctrl: IFrame | undefined, props: object): TBinding<IFrame> {
	const adapter = createAngularAdapterContext(FrameDescriptor(), { ctrl, props })

	return useAdapter(adapter)
}
