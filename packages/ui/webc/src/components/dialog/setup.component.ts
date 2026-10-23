import { DialogDescriptor, type DescriptorPluginOutputs } from '@soldy-ui/setup'
import type { IDialog } from '@soldy-ui/core'
import { createWebcAdapterContext, useAdapter } from '../../adapter'
import type { TBinding, TUpdateListener } from '../../adapter'

export type TDialogOutputs = DescriptorPluginOutputs<typeof DialogDescriptor>

export function setupDialog(
	host: HTMLElement,
	ctrl: IDialog | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<IDialog, unknown, TDialogOutputs> {
	const adapter = createWebcAdapterContext(host, DialogDescriptor(), { ctrl, props })

	return useAdapter(adapter, host, onUpdate)
}
