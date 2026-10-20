/**
 * setupInputControl — setup-слой InputControl.
 *
 * Создаёт adapter-context (`createSolidAdapterContext`) и связывает его с
 * Solid через useAdapter. Тело компонента Solid выполняется один раз,
 * поэтому контекст достаточно положить в обычную константу — useRef-обвязки,
 * как в React, не нужно.
 */

import { InputControlDescriptor } from '@soldy-ui/setup'
import { createSolidAdapterContext, useAdapter } from '../../adapter'
import type { InputControlProps } from './base.component'

export function setupInputControl(props: InputControlProps) {
	const adapter = createSolidAdapterContext(InputControlDescriptor(), { ctrl: props.ctrl, props })

	return useAdapter(adapter, props)
}
