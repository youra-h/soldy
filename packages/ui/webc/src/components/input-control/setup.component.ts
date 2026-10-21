/**
 * setupInputControl — setup-слой InputControl: поля формы с `readonly`,
 * `required` и `id`.
 *
 * Собирает компонент (`createWebcAdapterContext` — с локалью ближайшего
 * `<so-locale-provider>` вверх от элемента) и связывает его с элементом через
 * useAdapter. Хост нужен сборке, чтобы найти провайдер, и адаптеру, чтобы
 * диспатчить CustomEvent; о пропах ядра связка сообщает элементу колбэком
 * onUpdate.
 *
 * Тип значения у слоя не задан: его сужает наследник — поле ввода текстом,
 * оценка числом.
 */

import { InputControlDescriptor } from '@soldy-ui/setup'
import type { IInputControl } from '@soldy-ui/core'
import { createWebcAdapterContext, useAdapter } from '../../adapter'
import type { TBinding, TUpdateListener } from '../../adapter'

export function setupInputControl(
	host: HTMLElement,
	ctrl: IInputControl<unknown> | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<IInputControl<unknown>> {
	const adapter = createWebcAdapterContext(host, InputControlDescriptor(), { ctrl, props })

	return useAdapter(adapter, host, onUpdate)
}
