import {
	MenuRadioGroupDescriptor,
	TItemGroupExtension,
	TMenuRadioGroupExtension,
} from '@soldy-ui/setup'
import type { IMenuRadioGroup } from '@soldy-ui/core'
import { createWebcAdapterContext, useAdapter } from '../../../adapter'
import type { TBinding, TUpdateListener } from '../../../adapter'
import { createWebcElevator } from '../../../adapter/elevator'

export function setupMenuRadioGroup(
	host: HTMLElement,
	ctrl: IMenuRadioGroup | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<IMenuRadioGroup> {
	const elevator = createWebcElevator(host)
	const adapter = createWebcAdapterContext(host, MenuRadioGroupDescriptor(), { ctrl, props })
		.use(TItemGroupExtension, { elevator })
		.use(TMenuRadioGroupExtension, { elevator })

	return useAdapter(adapter, host, onUpdate)
}
