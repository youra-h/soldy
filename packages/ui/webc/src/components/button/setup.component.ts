/**
 * setupButton — setup-слой Button.
 *
 * Собирает компонент (`createWebcAdapterContext` — с локалью ближайшего
 * `<so-locale-provider>` вверх от элемента) и связывает его с элементом через
 * useAdapter. Хост нужен сборке, чтобы найти провайдер, и адаптеру, чтобы
 * диспатчить CustomEvent; о пропах ядра связка сообщает элементу колбэком
 * onUpdate.
 */

import { ButtonDescriptor } from '@soldy-ui/setup'
import type { IButton } from '@soldy-ui/core'
import { createWebcAdapterContext, useAdapter } from '../../adapter'
import type { TBinding, TUpdateListener } from '../../adapter'

export function setupButton(
	host: HTMLElement,
	ctrl: IButton | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<IButton> {
	const adapter = createWebcAdapterContext(host, ButtonDescriptor(), { ctrl, props })

	return useAdapter(adapter, host, onUpdate)
}
