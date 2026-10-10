/**
 * setupComponent — setup-слой Component.
 *
 * Создаёт adapter-context и связывает его с кастомным элементом через
 * useAdapter. Хост нужен адаптеру, чтобы диспатчить CustomEvent; о пропах и
 * событиях ядра связка сообщает элементу колбэками onUpdate и onEvent.
 */

import { createAdapterContext, ComponentDescriptor } from '@soldy-ui/setup'
import type { IComponent } from '@soldy-ui/core'
import { useAdapter } from '../../adapter'
import type { TBinding, TEventListener, TUpdateListener } from '../../adapter'

export function setupComponent(
	host: HTMLElement,
	ctrl: IComponent | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
	onEvent: TEventListener,
): TBinding<IComponent> {
	const adapter = createAdapterContext(ComponentDescriptor(), { ctrl, props })

	return useAdapter(adapter, host, onUpdate, onEvent)
}
