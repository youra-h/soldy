/**
 * setupSwitch — setup-слой Switch.
 *
 * Создаёт adapter-context (`createSolidAdapterContext`) и связывает его с
 * Solid через useAdapter. Тело компонента Solid выполняется один раз,
 * поэтому контекст достаточно положить в обычную константу — useRef-обвязки,
 * как в React, не нужно.
 */

import { SwitchDescriptor } from '@soldy-ui/setup'
import { createSolidAdapterContext, useAdapter } from '../../adapter'
import type { SwitchProps } from './base.component'

export function setupSwitch(props: SwitchProps) {
	const adapter = createSolidAdapterContext(SwitchDescriptor(), { ctrl: props.ctrl, props })

	// Переключает значение плагин по `change` поля; отметку разметка пишет
	// свойством `<input>`
	return useAdapter(adapter, props)
}
