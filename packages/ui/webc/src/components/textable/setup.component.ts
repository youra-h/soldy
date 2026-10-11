/**
 * setupTextable — setup-слой Textable.
 *
 * Создаёт adapter-context и связывает его с кастомным элементом через
 * useAdapter. Хост нужен адаптеру, чтобы диспатчить CustomEvent; о пропах
 * ядра связка сообщает элементу колбэком onUpdate.
 */

import { createAdapterContext, TextableDescriptor } from '@soldy-ui/setup'
import type { ITextable } from '@soldy-ui/core'
import { useAdapter } from '../../adapter'
import type { TBinding, TUpdateListener } from '../../adapter'

export function setupTextable(
	host: HTMLElement,
	ctrl: ITextable | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<ITextable> {
	const adapter = createAdapterContext(TextableDescriptor(), { ctrl, props })

	return useAdapter(adapter, host, onUpdate)
}
