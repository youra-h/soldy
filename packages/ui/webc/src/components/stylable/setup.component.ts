/**
 * setupStylable — setup-слой Stylable.
 *
 * Собирает компонент (`createWebcAdapterContext` — с локалью ближайшего
 * `<so-locale-provider>` вверх от элемента) и связывает его с элементом через
 * useAdapter. Хост нужен сборке, чтобы найти провайдер, и адаптеру, чтобы
 * диспатчить CustomEvent; о пропах ядра связка сообщает элементу колбэком
 * onUpdate.
 */

import { StylableDescriptor } from '@soldy-ui/setup'
import type { IStylable } from '@soldy-ui/core'
import { createWebcAdapterContext, useAdapter } from '../../adapter'
import type { TBinding, TUpdateListener } from '../../adapter'

export function setupStylable(
	host: HTMLElement,
	ctrl: IStylable | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<IStylable> {
	const adapter = createWebcAdapterContext(host, StylableDescriptor(), { ctrl, props })

	return useAdapter(adapter, host, onUpdate)
}
