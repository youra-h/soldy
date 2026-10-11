/**
 * setupControl — setup-слой Control.
 *
 * Создаёт adapter-context (`createSolidAdapterContext`) и связывает его с
 * Solid через useAdapter. Тело компонента Solid выполняется один раз,
 * поэтому контекст достаточно положить в обычную константу — useRef-обвязки,
 * как в React, не нужно.
 */

import { ControlDescriptor } from '@soldy-ui/setup'
import { createSolidAdapterContext, useAdapter } from '../../adapter'
import type { ControlProps } from './base.component'

export function setupControl(props: ControlProps) {
	const adapter = createSolidAdapterContext(ControlDescriptor(), { ctrl: props.ctrl, props })

	return useAdapter(adapter, props)
}
