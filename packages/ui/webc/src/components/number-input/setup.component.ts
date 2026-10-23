import { NumberInputDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import type { INumberInput } from '@soldy-ui/core'
import { createWebcAdapterContext, useAdapter } from '../../adapter'
import type { TBinding, TUpdateListener } from '../../adapter'
import { createWebcElevator } from '../../adapter/elevator'

export function setupNumberInput(
	host: HTMLElement,
	ctrl: INumberInput | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<INumberInput> {
	const adapter = createWebcAdapterContext(host, NumberInputDescriptor(), { ctrl, props }).use(
		TFieldControlExtension,
		{ elevator: createWebcElevator(host) },
	)

	return useAdapter(adapter, host, onUpdate)
}
