/**
 * setupComponent — setup-слой Component.
 *
 * Создаёт adapter-context и связывает его с кастомным элементом через
 * useAdapter. Хост нужен адаптеру, чтобы диспатчить CustomEvent.
 */

import { createAdapterContext, ComponentDescriptor } from '@soldy-ui/setup'
import type { IComponent } from '@soldy-ui/core'
import { useAdapter } from '../../adapter'
import type { TBinding } from '../../adapter'

export function setupComponent(
	host: HTMLElement,
	ctrl: IComponent | undefined,
	props: Record<string, unknown>,
	onUpdate: (name: string, value: unknown) => void,
): TBinding<IComponent> {
	const adapter = createAdapterContext(ComponentDescriptor(), { ctrl, props })

	return useAdapter(adapter, host, onUpdate)
}
