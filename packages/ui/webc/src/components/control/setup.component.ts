/**
 * setupControl — setup-слой Control.
 *
 * Создаёт adapter-context и связывает его с кастомным элементом через
 * useAdapter. Хост нужен адаптеру, чтобы диспатчить CustomEvent.
 */

import { createAdapterContext, ControlDescriptor } from '@soldy-ui/setup'
import type { IControl } from '@soldy-ui/core'
import { useAdapter } from '../../adapter'
import type { TBinding } from '../../adapter'

export function setupControl(
	host: HTMLElement,
	ctrl: IControl | undefined,
	props: Record<string, unknown>,
	onUpdate: (name: string, value: unknown) => void,
): TBinding<IControl> {
	const adapter = createAdapterContext(ControlDescriptor(), { ctrl, props })

	return useAdapter(adapter, host, onUpdate)
}
