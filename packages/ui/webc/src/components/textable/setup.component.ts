/**
 * setupTextable — setup-слой Textable.
 *
 * Собирает компонент (`createWebcAdapterContext` — с локалью ближайшего
 * `<so-locale-provider>` вверх от элемента) и связывает его с элементом через
 * useAdapter. Хост нужен сборке, чтобы найти провайдер, и адаптеру, чтобы
 * диспатчить CustomEvent; о пропах ядра связка сообщает элементу колбэком
 * onUpdate.
 */

import { TextableDescriptor } from '@soldy-ui/setup'
import type { ITextable } from '@soldy-ui/core'
import { createWebcAdapterContext, useAdapter } from '../../adapter'
import type { TBinding, TUpdateListener } from '../../adapter'

export function setupTextable(
	host: HTMLElement,
	ctrl: ITextable | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<ITextable> {
	const adapter = createWebcAdapterContext(host, TextableDescriptor(), { ctrl, props })

	return useAdapter(adapter, host, onUpdate)
}
