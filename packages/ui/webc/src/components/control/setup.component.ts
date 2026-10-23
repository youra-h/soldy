import { ControlDescriptor } from '@soldy-ui/setup'
import type { IControl } from '@soldy-ui/core'
import { createWebcAdapterContext, useAdapter } from '../../adapter'
import type { TBinding, TUpdateListener } from '../../adapter'

export function setupControl(
	host: HTMLElement,
	ctrl: IControl | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<IControl> {
	const adapter = createWebcAdapterContext(host, ControlDescriptor(), { ctrl, props })

	return useAdapter(adapter, host, onUpdate)
}
