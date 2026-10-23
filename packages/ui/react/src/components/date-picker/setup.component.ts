import { DatePickerDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import { useComponent, useRootElement } from '../../adapter'
import type { DatePickerProps } from './base.component'

/**
 * Поля, календарь и движок — экземпляры ядра текущей сборки, разметка отдаёт их целиком:
 * AGENTS.md (React), «Пересобранный инстанс и `key`».
 */
export function useSetupDatePicker(props: DatePickerProps) {
	const binding = useComponent(
		(create, elevator) =>
			create(DatePickerDescriptor(), { ctrl: props.ctrl, props }).use(
				TFieldControlExtension,
				{ elevator },
			),
		props,
	)
	const picker = binding.ctrl

	return {
		...binding,
		rootElement: useRootElement(binding.root),
		field: picker.field,
		start: picker.start,
		end: picker.end,
		calendar: picker.calendar,
		engine: picker.engine,
	}
}
