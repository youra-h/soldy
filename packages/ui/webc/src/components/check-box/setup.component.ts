import { CheckBoxDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import type { ICheckBox } from '@soldy-ui/core'
import { createWebcAdapterContext, useAdapter } from '../../adapter'
import type { TBinding, TUpdateListener } from '../../adapter'
import { createWebcElevator } from '../../adapter/elevator'

export function setupCheckBox(
	host: HTMLElement,
	ctrl: ICheckBox | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<ICheckBox> {
	const adapter = createWebcAdapterContext(host, CheckBoxDescriptor(), { ctrl, props }).use(
		TFieldControlExtension,
		{ elevator: createWebcElevator(host) },
	)

	return useAdapter(adapter, host, onUpdate)
}
