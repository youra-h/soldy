import { FrameDescriptor } from '@soldy-ui/setup'
import type { IFrame } from '@soldy-ui/core'
import { createWebcAdapterContext, useAdapter } from '../../adapter'
import type { TBinding, TUpdateListener } from '../../adapter'

export function setupFrame(
	host: HTMLElement,
	ctrl: IFrame | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<IFrame> {
	const adapter = createWebcAdapterContext(host, FrameDescriptor(), { ctrl, props })

	return useAdapter(adapter, host, onUpdate)
}
