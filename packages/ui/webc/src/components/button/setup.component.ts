/**
 * setupButton — setup-слой Button.
 *
 * Создаёт adapter-context и связывает его с кастомным элементом через
 * useAdapter. Хост нужен адаптеру, чтобы диспатчить CustomEvent.
 */

import { createAdapterContext, ButtonDescriptor } from '@soldy-ui/setup'
import type { IButton } from '@soldy-ui/core'
import { useAdapter } from '../../adapter'
import type { TBinding } from '../../adapter'

export function setupButton(
	host: HTMLElement,
	ctrl: IButton | undefined,
	props: Record<string, unknown>,
	onUpdate: (name: string, value: unknown) => void,
): TBinding<IButton> {
	const adapter = createAdapterContext(ButtonDescriptor(), { ctrl, props })

	return useAdapter(adapter, host, onUpdate)
}
