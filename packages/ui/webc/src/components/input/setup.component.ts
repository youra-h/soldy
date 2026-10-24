import { InputDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import type { DescriptorPluginProps } from '@soldy-ui/setup'
import type { IInput } from '@soldy-ui/core'
import { createWebcAdapterContext, useAdapter } from '../../adapter'
import type { TBinding, TUpdateListener } from '../../adapter'
import { createWebcElevator } from '../../adapter/elevator'

/** Сверх инстанса шаблон читает входы плагинов: `id` поля — проп `TIdPlugin`. */
export type TInputOutputs = DescriptorPluginProps<typeof InputDescriptor>

export function setupInput(
	host: HTMLElement,
	ctrl: IInput | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<IInput, unknown, TInputOutputs> {
	const adapter = createWebcAdapterContext(host, InputDescriptor(), { ctrl, props }).use(
		TFieldControlExtension,
		{ elevator: createWebcElevator(host) },
	)

	return useAdapter(adapter, host, onUpdate)
}
