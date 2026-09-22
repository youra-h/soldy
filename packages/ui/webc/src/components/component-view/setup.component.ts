/**
 * setupComponentView — setup-слой ComponentView.
 *
 * Создаёт adapter-context и связывает его с кастомным элементом через
 * useAdapter. Хост нужен адаптеру, чтобы диспатчить CustomEvent.
 */

import { createAdapterContext, ComponentViewDescriptor } from '@soldy-ui/setup'
import type { IComponentView } from '@soldy-ui/core'
import { useAdapter } from '../../adapter'
import type { TBinding } from '../../adapter'

export function setupComponentView(
	host: HTMLElement,
	ctrl: IComponentView | undefined,
	props: Record<string, unknown>,
	onUpdate: (name: string, value: unknown) => void,
): TBinding<IComponentView> {
	const adapter = createAdapterContext(ComponentViewDescriptor(), { ctrl, props })

	return useAdapter(adapter, host, onUpdate)
}
