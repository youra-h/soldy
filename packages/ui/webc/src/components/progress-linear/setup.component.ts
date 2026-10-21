/**
 * setupProgressLinear — setup-слой ProgressLinear.
 *
 * Собирает компонент (`createWebcAdapterContext` — с локалью ближайшего
 * `<so-locale-provider>` вверх от элемента) и связывает его с элементом через
 * useAdapter. Логики здесь нет: долю, `aria-value*`, `data-indeterminate` и
 * модификатор оси считает ядро, бег рисует тема. Выход `percentStyle` на
 * корень кладёт база элемента — как стиль-выход, имя которого называет
 * элемент.
 */

import { ProgressLinearDescriptor } from '@soldy-ui/setup'
import type { IProgressLinear } from '@soldy-ui/core'
import { createWebcAdapterContext, useAdapter } from '../../adapter'
import type { TBinding, TUpdateListener } from '../../adapter'

export function setupProgressLinear(
	host: HTMLElement,
	ctrl: IProgressLinear | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<IProgressLinear> {
	const adapter = createWebcAdapterContext(host, ProgressLinearDescriptor(), { ctrl, props })

	return useAdapter(adapter, host, onUpdate)
}
