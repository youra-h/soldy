/**
 * setupComponent — setup-слой Component.
 *
 * Создаёт adapter-context и связывает его с кастомным элементом через
 * useAdapter. Хост нужен адаптеру, чтобы диспатчить CustomEvent; о пропах
 * ядра связка сообщает элементу колбэком onUpdate.
 */

import { createAdapterContext, ComponentDescriptor } from '@soldy-ui/setup'
import type { IComponent } from '@soldy-ui/core'
import { useAdapter } from '../../adapter'
import type { TBinding, TUpdateListener } from '../../adapter'

export function setupComponent(
	host: HTMLElement,
	ctrl: IComponent | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<IComponent> {
	const adapter = createAdapterContext(ComponentDescriptor(), { ctrl, props })

	return useAdapter(adapter, host, onUpdate)
}
