/**
 * setupInteractive — setup-слой Interactive.
 *
 * Собирает компонент (`createWebcAdapterContext` — с локалью ближайшего
 * `<so-locale-provider>` вверх от элемента) и связывает его с элементом через
 * useAdapter. Хост нужен сборке, чтобы найти провайдер, и адаптеру, чтобы
 * диспатчить CustomEvent; о пропах ядра связка сообщает элементу колбэком
 * onUpdate.
 */

import { InteractiveDescriptor } from '@soldy-ui/setup'
import type { IInteractive } from '@soldy-ui/core'
import { createWebcAdapterContext, useAdapter } from '../../adapter'
import type { TBinding, TUpdateListener } from '../../adapter'

export function setupInteractive(
	host: HTMLElement,
	ctrl: IInteractive | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<IInteractive> {
	const adapter = createWebcAdapterContext(host, InteractiveDescriptor(), { ctrl, props })

	return useAdapter(adapter, host, onUpdate)
}
