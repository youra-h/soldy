/**
 * setupTextable — setup-слой Textable.
 *
 * Создаёт adapter-context и связывает его с кастомным элементом через
 * useAdapter. Хост нужен адаптеру, чтобы диспатчить CustomEvent.
 */

import { createAdapterContext, TextableDescriptor } from '@soldy/setup'
import type { ITextable } from '@soldy/core'
import { useAdapter } from '../../adapter'
import type { TBinding } from '../../adapter'

export function setupTextable(
	host: HTMLElement,
	props: Record<string, unknown>,
	onUpdate: (name: string, value: unknown) => void,
): TBinding<ITextable> {
	const adapter = createAdapterContext(TextableDescriptor(), { ctrl: props.ctrl, props })

	return useAdapter<ITextable>(adapter, host, onUpdate)
}
