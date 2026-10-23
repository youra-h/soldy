import { StylableDescriptor } from '@soldy-ui/setup'
import type { IStylable } from '@soldy-ui/core'
import { createWebcAdapterContext, useAdapter } from '../../adapter'
import type { TBinding, TUpdateListener } from '../../adapter'

export function setupStylable(
	host: HTMLElement,
	ctrl: IStylable | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<IStylable> {
	const adapter = createWebcAdapterContext(host, StylableDescriptor(), { ctrl, props })

	return useAdapter(adapter, host, onUpdate)
}
