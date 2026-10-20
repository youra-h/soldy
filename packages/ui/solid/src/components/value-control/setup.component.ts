/**
 * setupValueControl — setup-слой ValueControl.
 *
 * Создаёт adapter-context (`createSolidAdapterContext`) и связывает его с
 * Solid через useAdapter. Тело компонента Solid выполняется один раз,
 * поэтому контекст достаточно положить в обычную константу — useRef-обвязки,
 * как в React, не нужно.
 */

import { ValueControlDescriptor } from '@soldy-ui/setup'
import { createSolidAdapterContext, useAdapter } from '../../adapter'
import type { ValueControlProps } from './base.component'

export function setupValueControl(props: ValueControlProps) {
	const adapter = createSolidAdapterContext(ValueControlDescriptor(), { ctrl: props.ctrl, props })

	return useAdapter(adapter, props)
}
