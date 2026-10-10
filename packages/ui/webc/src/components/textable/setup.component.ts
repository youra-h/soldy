/**
 * setupTextable — setup-слой Textable.
 *
 * Создаёт adapter-context и связывает его с кастомным элементом через
 * useAdapter. Хост нужен адаптеру, чтобы диспатчить CustomEvent; о пропах и
 * событиях ядра связка сообщает элементу колбэками onUpdate и onEvent.
 */

import { createAdapterContext, TextableDescriptor } from '@soldy-ui/setup'
import type { ITextable } from '@soldy-ui/core'
import { useAdapter } from '../../adapter'
import type { TBinding, TEventListener, TUpdateListener } from '../../adapter'

export function setupTextable(
	host: HTMLElement,
	ctrl: ITextable | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
	onEvent: TEventListener,
): TBinding<ITextable> {
	const adapter = createAdapterContext(TextableDescriptor(), { ctrl, props })

	return useAdapter(adapter, host, onUpdate, onEvent)
}
