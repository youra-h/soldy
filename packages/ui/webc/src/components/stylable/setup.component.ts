/**
 * setupStylable — setup-слой Stylable.
 *
 * Создаёт adapter-context и связывает его с кастомным элементом через
 * useAdapter. Хост нужен адаптеру, чтобы диспатчить CustomEvent.
 */

import { createAdapterContext, StylableDescriptor } from '@soldy-ui/setup'
import type { IStylable } from '@soldy-ui/core'
import { useAdapter } from '../../adapter'
import type { TBinding } from '../../adapter'

export function setupStylable(
	host: HTMLElement,
	ctrl: IStylable | undefined,
	props: Record<string, unknown>,
	onUpdate: (name: string, value: unknown) => void,
): TBinding<IStylable> {
	const adapter = createAdapterContext(StylableDescriptor(), { ctrl, props })

	return useAdapter(adapter, host, onUpdate)
}
