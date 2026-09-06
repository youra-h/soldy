/**
 * setupControl — setup-слой Control.
 *
 * Создаёт adapter-context и связывает его с кастомным элементом через
 * useAdapter. Хост нужен адаптеру, чтобы диспатчить CustomEvent.
 */

import { createAdapterContext, ControlDescriptor } from '@soldy/setup'
import type { IControl } from '@soldy/core'
import { useAdapter } from '../../adapter'
import type { TBinding } from '../../adapter'

export function setupControl(
	host: HTMLElement,
	props: Record<string, unknown>,
	onUpdate: (name: string, value: unknown) => void,
): TBinding<IControl> {
	const adapter = createAdapterContext(ControlDescriptor(), { ctrl: props.ctrl, props })

	return useAdapter<IControl>(adapter, host, onUpdate)
}
