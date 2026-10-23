import { InputDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import type { IInput } from '@soldy-ui/core'
import { createWebcAdapterContext, useAdapter } from '../../adapter'
import type { TBinding, TUpdateListener } from '../../adapter'
import { createWebcElevator } from '../../adapter/elevator'

export function setupInput(
	host: HTMLElement,
	ctrl: IInput | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<IInput> {
	const adapter = createWebcAdapterContext(host, InputDescriptor(), { ctrl, props }).use(
		TFieldControlExtension,
		{ elevator: createWebcElevator(host) },
	)

	return useAdapter(adapter, host, onUpdate)
}
