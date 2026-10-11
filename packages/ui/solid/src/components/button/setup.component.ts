/**
 * setupButton — setup-слой Button.
 *
 * Создаёт adapter-context (`createSolidAdapterContext`) и связывает его с
 * Solid через useAdapter. Тело компонента Solid выполняется один раз,
 * поэтому контекст достаточно положить в обычную константу — useRef-обвязки,
 * как в React, не нужно.
 */

import { ButtonDescriptor } from '@soldy-ui/setup'
import { createSolidAdapterContext, useAdapter } from '../../adapter'
import type { ButtonProps } from './base.component'

export function setupButton(props: ButtonProps) {
	const adapter = createSolidAdapterContext(ButtonDescriptor(), { ctrl: props.ctrl, props })

	return useAdapter(adapter, props)
}
