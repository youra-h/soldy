/**
 * setupInput — setup-слой Input.
 *
 * Создаёт adapter-context (`createSolidAdapterContext`) и связывает его с
 * Solid через useAdapter. Тело компонента Solid выполняется один раз,
 * поэтому контекст достаточно положить в обычную константу — useRef-обвязки,
 * как в React, не нужно.
 */

import { InputDescriptor } from '@soldy-ui/setup'
import { createSolidAdapterContext, useAdapter } from '../../adapter'
import type { InputProps } from './base.component'

export function setupInput(props: InputProps) {
	const adapter = createSolidAdapterContext(InputDescriptor(), { ctrl: props.ctrl, props })

	// Текст в ядро несёт плагин ввода по `input` поля, имя кнопки очистки
	// (`clearAria`) пишет плагин имён формы по локали поддерева
	return useAdapter(adapter, props)
}
