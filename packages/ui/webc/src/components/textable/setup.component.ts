/**
 * setupTextable — setup-слой Textable.
 *
 * Создаёт adapter-context и связывает его с кастомным элементом через
 * useAdapter. Хост нужен адаптеру, чтобы диспатчить CustomEvent.
 */

import { createAdapterContext, TextableDescriptor } from '@soldy-ui/setup'
import type { ITextable } from '@soldy-ui/core'
import { useAdapter } from '../../adapter'
import type { TBinding } from '../../adapter'

export function setupTextable(
	host: HTMLElement,
	ctrl: ITextable | undefined,
	props: Record<string, unknown>,
	onUpdate: (name: string, value: unknown) => void,
): TBinding<ITextable> {
	const adapter = createAdapterContext(TextableDescriptor(), { ctrl, props })

	return useAdapter(adapter, host, onUpdate)
}
