/**
 * setupStylable — setup-слой Stylable.
 *
 * Создаёт adapter-context (`createSolidAdapterContext`) и связывает его с
 * Solid через useAdapter. Тело компонента Solid выполняется один раз,
 * поэтому контекст достаточно положить в обычную константу — useRef-обвязки,
 * как в React, не нужно.
 */

import { StylableDescriptor } from '@soldy-ui/setup'
import { createSolidAdapterContext, useAdapter } from '../../adapter'
import type { StylableProps } from './base.component'

export function setupStylable(props: StylableProps) {
	const adapter = createSolidAdapterContext(StylableDescriptor(), { ctrl: props.ctrl, props })

	return useAdapter(adapter, props)
}
