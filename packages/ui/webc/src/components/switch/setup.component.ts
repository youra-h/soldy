import { SwitchDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import type { ISwitch } from '@soldy-ui/core'
import { createWebcAdapterContext, useAdapter } from '../../adapter'
import type { TBinding, TUpdateListener } from '../../adapter'
import { createWebcElevator } from '../../adapter/elevator'

export function setupSwitch(
	host: HTMLElement,
	ctrl: ISwitch | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<ISwitch> {
	const adapter = createWebcAdapterContext(host, SwitchDescriptor(), { ctrl, props }).use(
		TFieldControlExtension,
		{ elevator: createWebcElevator(host) },
	)

	return useAdapter(adapter, host, onUpdate)
}
