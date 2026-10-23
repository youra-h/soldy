import { PopoverDescriptor, type DescriptorPluginOutputs } from '@soldy-ui/setup'
import type { IPopover } from '@soldy-ui/core'
import { createWebcAdapterContext, useAdapter } from '../../adapter'
import type { TBinding, TUpdateListener } from '../../adapter'

export type TPopoverOutputs = DescriptorPluginOutputs<typeof PopoverDescriptor>

export function setupPopover(
	host: HTMLElement,
	ctrl: IPopover | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<IPopover, unknown, TPopoverOutputs> {
	const adapter = createWebcAdapterContext(host, PopoverDescriptor(), { ctrl, props })

	return useAdapter(adapter, host, onUpdate)
}
