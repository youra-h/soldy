/**
 * setupControl — setup-слой Control.
 *
 * Создаёт adapter-context и связывает его с кастомным элементом через
 * useAdapter. Хост нужен адаптеру, чтобы диспатчить CustomEvent; о пропах
 * ядра связка сообщает элементу колбэком onUpdate.
 */

import { createAdapterContext, ControlDescriptor } from '@soldy-ui/setup'
import type { IControl } from '@soldy-ui/core'
import { useAdapter } from '../../adapter'
import type { TBinding, TUpdateListener } from '../../adapter'

export function setupControl(
	host: HTMLElement,
	ctrl: IControl | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<IControl> {
	const adapter = createAdapterContext(ControlDescriptor(), { ctrl, props })

	return useAdapter(adapter, host, onUpdate)
}
