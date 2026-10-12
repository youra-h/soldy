/**
 * setupCheckBox — setup-слой CheckBox.
 *
 * Создаёт adapter-context (`createSolidAdapterContext`) и связывает его с
 * Solid через useAdapter. Тело компонента Solid выполняется один раз,
 * поэтому контекст достаточно положить в обычную константу — useRef-обвязки,
 * как в React, не нужно.
 */

import { CheckBoxDescriptor } from '@soldy-ui/setup'
import { createSolidAdapterContext, useAdapter } from '../../adapter'
import type { CheckBoxProps } from './base.component'

export function setupCheckBox(props: CheckBoxProps) {
	const adapter = createSolidAdapterContext(CheckBoxDescriptor(), { ctrl: props.ctrl, props })

	// Переключает значение плагин флажка по `change` поля; отметку и «выбрано
	// частично» разметка пишет свойствами `<input>`
	return useAdapter(adapter, props)
}
