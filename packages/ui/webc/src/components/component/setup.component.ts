/**
 * setupComponent — setup-слой Component.
 *
 * Создаёт adapter-context и связывает его с кастомным элементом через
 * useAdapter. Хост нужен адаптеру, чтобы диспатчить CustomEvent.
 */

import { createAdapterContext, ComponentDescriptor } from '@soldy/setup'
import type { IComponent } from '@soldy/core'
import { useAdapter } from '../../adapter'
import type { TBinding } from '../../adapter'

export function setupComponent(
	host: HTMLElement,
	props: Record<string, unknown>,
	onUpdate: (name: string, value: unknown) => void,
): TBinding<IComponent> {
	const adapter = createAdapterContext(ComponentDescriptor(), { ctrl: props.ctrl, props })

	return useAdapter<IComponent>(adapter, host, onUpdate)
}
