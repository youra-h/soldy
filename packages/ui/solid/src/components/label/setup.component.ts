/**
 * setupLabel — setup-слой Label.
 *
 * Создаёт adapter-context (`createSolidAdapterContext`) и связывает его с
 * Solid через useAdapter. Тело компонента Solid выполняется один раз,
 * поэтому контекст достаточно положить в обычную константу — useRef-обвязки,
 * как в React, не нужно.
 */

import { LabelDescriptor } from '@soldy-ui/setup'
import { createSolidAdapterContext, useAdapter } from '../../adapter'
import type { LabelProps } from './base.component'

export function setupLabel(props: LabelProps) {
	const adapter = createSolidAdapterContext(LabelDescriptor(), { ctrl: props.ctrl, props })

	return useAdapter(adapter, props)
}
