import { IconDescriptor } from '@soldy-ui/setup'
import type { IIcon } from '@soldy-ui/core'
import { createWebcAdapterContext, useAdapter } from '../../adapter'
import type { TBinding, TUpdateListener } from '../../adapter'

export function setupIcon(
	host: HTMLElement,
	ctrl: IIcon | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<IIcon> {
	const adapter = createWebcAdapterContext(host, IconDescriptor(), { ctrl, props })

	return useAdapter(adapter, host, onUpdate)
}
