/**
 * setupButton — setup-слой Button.
 *
 * Создаёт adapter-context и связывает его с кастомным элементом через
 * useAdapter. Хост нужен адаптеру, чтобы диспатчить CustomEvent; о пропах
 * ядра связка сообщает элементу колбэком onUpdate.
 */

import { createAdapterContext, ButtonDescriptor } from '@soldy-ui/setup'
import type { IButton } from '@soldy-ui/core'
import { useAdapter } from '../../adapter'
import type { TBinding, TUpdateListener } from '../../adapter'

export function setupButton(
	host: HTMLElement,
	ctrl: IButton | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<IButton> {
	const adapter = createAdapterContext(ButtonDescriptor(), { ctrl, props })

	return useAdapter(adapter, host, onUpdate)
}
