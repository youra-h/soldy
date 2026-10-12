/**
 * setupProgressSpinner — setup-слой ProgressSpinner.
 *
 * Собирает компонент (`createWebcAdapterContext` — с локалью ближайшего
 * `<so-locale-provider>` вверх от элемента) и связывает его с элементом через
 * useAdapter. Логики здесь нет: долю, `aria-value*` и `data-indeterminate`
 * считает ядро, рисунок и бег — тема. Выход `fractionStyle` на корень кладёт
 * база элемента — как стиль-выход, имя которого называет элемент.
 */

import { ProgressSpinnerDescriptor } from '@soldy-ui/setup'
import type { IProgressSpinner } from '@soldy-ui/core'
import { createWebcAdapterContext, useAdapter } from '../../adapter'
import type { TBinding, TUpdateListener } from '../../adapter'

export function setupProgressSpinner(
	host: HTMLElement,
	ctrl: IProgressSpinner | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<IProgressSpinner> {
	const adapter = createWebcAdapterContext(host, ProgressSpinnerDescriptor(), { ctrl, props })

	return useAdapter(adapter, host, onUpdate)
}
