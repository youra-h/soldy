import { ItemRowDescriptor } from '@soldy-ui/setup'
import type { IButton } from '@soldy-ui/core'
import { createWebcAdapterContext, useAdapter } from '../../adapter'
import type { TBinding, TUpdateListener } from '../../adapter'

export function setupItemRow(
	host: HTMLElement,
	ctrl: IButton | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<IButton> {
	const adapter = createWebcAdapterContext(host, ItemRowDescriptor(), { ctrl, props })

	return useAdapter(adapter, host, onUpdate)
}
