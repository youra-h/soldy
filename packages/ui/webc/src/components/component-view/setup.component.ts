/**
 * setupComponentView — setup-слой ComponentView.
 *
 * Создаёт adapter-context и связывает его с кастомным элементом через
 * useAdapter. Хост нужен адаптеру, чтобы диспатчить CustomEvent; о пропах и
 * событиях ядра связка сообщает элементу колбэками onUpdate и onEvent.
 */

import { createAdapterContext, ComponentViewDescriptor } from '@soldy-ui/setup'
import type { IComponentView } from '@soldy-ui/core'
import { useAdapter } from '../../adapter'
import type { TBinding, TEventListener, TUpdateListener } from '../../adapter'

export function setupComponentView(
	host: HTMLElement,
	ctrl: IComponentView | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
	onEvent: TEventListener,
): TBinding<IComponentView> {
	const adapter = createAdapterContext(ComponentViewDescriptor(), { ctrl, props })

	return useAdapter(adapter, host, onUpdate, onEvent)
}
