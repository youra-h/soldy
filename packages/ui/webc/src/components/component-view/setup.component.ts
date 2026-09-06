/**
 * setupComponentView — setup-слой ComponentView.
 *
 * Создаёт adapter-context и связывает его с кастомным элементом через
 * useAdapter. Хост нужен адаптеру, чтобы диспатчить CustomEvent.
 */

import { createAdapterContext, ComponentViewDescriptor } from '@soldy/setup'
import type { IComponentView } from '@soldy/core'
import { useAdapter } from '../../adapter'
import type { TBinding } from '../../adapter'

export function setupComponentView(
	host: HTMLElement,
	props: Record<string, unknown>,
	onUpdate: (name: string, value: unknown) => void,
): TBinding<IComponentView> {
	const adapter = createAdapterContext(ComponentViewDescriptor(), { ctrl: props.ctrl, props })

	return useAdapter<IComponentView>(adapter, host, onUpdate)
}
