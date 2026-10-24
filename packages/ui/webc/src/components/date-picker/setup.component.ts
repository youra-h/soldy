import {
	DatePickerDescriptor,
	TFieldControlExtension,
	type DescriptorPluginOutputs,
	type DescriptorPluginProps,
} from '@soldy-ui/setup'
import type { IDatePicker } from '@soldy-ui/core'
import { createWebcAdapterContext, useAdapter } from '../../adapter'
import type { TBinding, TUpdateListener } from '../../adapter'
import { createWebcElevator } from '../../adapter/elevator'

/**
 * Сверх инстанса шаблон читает входы и выходы плагинов: пропсы имени — у одной
 * даты их получает поле — и `id` корня, проп `TIdPlugin`.
 */
export type TDatePickerOutputs = DescriptorPluginProps<typeof DatePickerDescriptor> &
	DescriptorPluginOutputs<typeof DatePickerDescriptor>

export function setupDatePicker(
	host: HTMLElement,
	ctrl: IDatePicker | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<IDatePicker, unknown, TDatePickerOutputs> {
	const adapter = createWebcAdapterContext(host, DatePickerDescriptor(), { ctrl, props }).use(
		TFieldControlExtension,
		{ elevator: createWebcElevator(host) },
	)

	return useAdapter(adapter, host, onUpdate)
}
