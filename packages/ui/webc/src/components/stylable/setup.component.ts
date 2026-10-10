/**
 * setupStylable — setup-слой Stylable.
 *
 * Создаёт adapter-context и связывает его с кастомным элементом через
 * useAdapter. Хост нужен адаптеру, чтобы диспатчить CustomEvent; о пропах и
 * событиях ядра связка сообщает элементу колбэками onUpdate и onEvent.
 */

import { createAdapterContext, StylableDescriptor } from '@soldy-ui/setup'
import type { IStylable } from '@soldy-ui/core'
import { useAdapter } from '../../adapter'
import type { TBinding, TEventListener, TUpdateListener } from '../../adapter'

export function setupStylable(
	host: HTMLElement,
	ctrl: IStylable | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
	onEvent: TEventListener,
): TBinding<IStylable> {
	const adapter = createAdapterContext(StylableDescriptor(), { ctrl, props })

	return useAdapter(adapter, host, onUpdate, onEvent)
}
