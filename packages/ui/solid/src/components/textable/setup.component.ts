/**
 * setupTextable — setup-слой Textable.
 *
 * Создаёт adapter-context (`createSolidAdapterContext`) и связывает его с
 * Solid через useAdapter. Тело компонента Solid выполняется один раз,
 * поэтому контекст достаточно положить в обычную константу — useRef-обвязки,
 * как в React, не нужно.
 */

import { TextableDescriptor } from '@soldy-ui/setup'
import { createSolidAdapterContext, useAdapter } from '../../adapter'
import type { TextableProps } from './base.component'

export function setupTextable(props: TextableProps) {
	const adapter = createSolidAdapterContext(TextableDescriptor(), { ctrl: props.ctrl, props })

	return useAdapter(adapter, props)
}
