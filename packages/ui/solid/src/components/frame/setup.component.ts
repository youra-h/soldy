/**
 * setupFrame — setup-слой Frame.
 *
 * Создаёт adapter-context (`createSolidAdapterContext`) и связывает его с
 * Solid через useAdapter. Тело компонента Solid выполняется один раз,
 * поэтому контекст достаточно положить в обычную константу — useRef-обвязки,
 * как в React, не нужно.
 */

import { FrameDescriptor } from '@soldy-ui/setup'
import { createSolidAdapterContext, useAdapter } from '../../adapter'
import type { FrameProps } from './base.component'

export function setupFrame(props: FrameProps) {
	const adapter = createSolidAdapterContext(FrameDescriptor(), { ctrl: props.ctrl, props })

	// Выход `layout_styles` разметка кладёт в стиль корня
	return useAdapter(adapter, props)
}
