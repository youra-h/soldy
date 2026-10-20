/**
 * setupInteractive — setup-слой Interactive.
 *
 * Создаёт adapter-context (`createSolidAdapterContext`) и связывает его с
 * Solid через useAdapter. Тело компонента Solid выполняется один раз,
 * поэтому контекст достаточно положить в обычную константу — useRef-обвязки,
 * как в React, не нужно.
 */

import { InteractiveDescriptor } from '@soldy-ui/setup'
import { createSolidAdapterContext, useAdapter } from '../../adapter'
import type { InteractiveProps } from './base.component'

export function setupInteractive(props: InteractiveProps) {
	const adapter = createSolidAdapterContext(InteractiveDescriptor(), { ctrl: props.ctrl, props })

	return useAdapter(adapter, props)
}
