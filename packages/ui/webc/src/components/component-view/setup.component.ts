/**
 * setupComponentView — setup-слой ComponentView.
 *
 * Собирает компонент (`createWebcAdapterContext` — с локалью ближайшего
 * `<so-locale-provider>` вверх от элемента) и связывает его с элементом через
 * useAdapter. Хост нужен сборке, чтобы найти провайдер, и адаптеру, чтобы
 * диспатчить CustomEvent; о пропах ядра связка сообщает элементу колбэком
 * onUpdate.
 */

import { ComponentViewDescriptor } from '@soldy-ui/setup'
import type { IComponentView } from '@soldy-ui/core'
import { createWebcAdapterContext, useAdapter } from '../../adapter'
import type { TBinding, TUpdateListener } from '../../adapter'

export function setupComponentView(
	host: HTMLElement,
	ctrl: IComponentView | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<IComponentView> {
	const adapter = createWebcAdapterContext(host, ComponentViewDescriptor(), { ctrl, props })

	return useAdapter(adapter, host, onUpdate)
}
