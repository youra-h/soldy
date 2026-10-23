import { ComponentDescriptor } from '@soldy-ui/setup'
import type { IComponent } from '@soldy-ui/core'
import { createWebcAdapterContext, useAdapter } from '../../adapter'
import type { TBinding, TUpdateListener } from '../../adapter'

export function setupComponent(
	host: HTMLElement,
	ctrl: IComponent | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<IComponent> {
	const adapter = createWebcAdapterContext(host, ComponentDescriptor(), { ctrl, props })

	return useAdapter(adapter, host, onUpdate)
}
