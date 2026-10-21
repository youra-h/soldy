/**
 * setupValueControl — setup-слой ValueControl.
 *
 * Собирает компонент (`createWebcAdapterContext` — с локалью ближайшего
 * `<so-locale-provider>` вверх от элемента) и связывает его с элементом через
 * useAdapter. Хост нужен сборке, чтобы найти провайдер, и адаптеру, чтобы
 * диспатчить CustomEvent; о пропах ядра связка сообщает элементу колбэком
 * onUpdate.
 *
 * Тип значения у слоя не задан: его сужает наследник — ползунок числом или
 * списком чисел, пагинация ключом страницы.
 */

import { ValueControlDescriptor } from '@soldy-ui/setup'
import type { IValueControl } from '@soldy-ui/core'
import { createWebcAdapterContext, useAdapter } from '../../adapter'
import type { TBinding, TUpdateListener } from '../../adapter'

export function setupValueControl(
	host: HTMLElement,
	ctrl: IValueControl<unknown> | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<IValueControl<unknown>> {
	const adapter = createWebcAdapterContext(host, ValueControlDescriptor(), { ctrl, props })

	return useAdapter(adapter, host, onUpdate)
}
