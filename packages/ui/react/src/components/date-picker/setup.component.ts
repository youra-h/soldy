import { DatePickerDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import { useComponent, useRootElement } from '../../adapter'
import type { DatePickerProps } from './base.component'

/**
 * The calendar and its engine are core instances of the current assembly; the
 * markup hands them over whole and reads a mode's fields from the instance in
 * that mode's branch — the core creates a field when its mode needs it:
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
		calendar: picker.calendar,
		engine: picker.engine,
	}
}
