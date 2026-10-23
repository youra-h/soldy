import {
	DatePickerDescriptor,
	TFieldControlExtension,
	type DescriptorAllProps,
	type DescriptorPluginOutputs,
} from '@soldy-ui/setup'
import type { IDatePicker } from '@soldy-ui/core'
import { createWebcAdapterContext, useAdapter } from '../../adapter'
import type { TBinding, TUpdateListener } from '../../adapter'
import { createWebcElevator } from '../../adapter/elevator'

/** Сверх инстанса шаблон читает выходы плагинов и пропсы имени: у одной даты их получает поле. */
export type TDatePickerOutputs = DescriptorPluginOutputs<typeof DatePickerDescriptor> &
	Pick<
		DescriptorAllProps<typeof DatePickerDescriptor>,
		'aria_label' | 'aria_labelledBy' | 'aria_describedBy'
	>

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
