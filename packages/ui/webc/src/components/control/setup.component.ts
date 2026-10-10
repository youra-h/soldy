/**
 * setupControl — setup-слой Control.
 *
 * Создаёт adapter-context и связывает его с кастомным элементом через
 * useAdapter. Хост нужен адаптеру, чтобы диспатчить CustomEvent; о пропах и
 * событиях ядра связка сообщает элементу колбэками onUpdate и onEvent.
 */

import { createAdapterContext, ControlDescriptor } from '@soldy-ui/setup'
import type { IControl } from '@soldy-ui/core'
import { useAdapter } from '../../adapter'
import type { TBinding, TEventListener, TUpdateListener } from '../../adapter'

export function setupControl(
	host: HTMLElement,
	ctrl: IControl | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
	onEvent: TEventListener,
): TBinding<IControl> {
	const adapter = createAdapterContext(ControlDescriptor(), { ctrl, props })

	return useAdapter(adapter, host, onUpdate, onEvent)
}
