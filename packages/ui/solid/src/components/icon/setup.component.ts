/**
 * setupIcon — setup-слой Icon.
 *
 * Создаёт adapter-context (`createSolidAdapterContext`) и связывает его с
 * Solid через useAdapter. Тело компонента Solid выполняется один раз,
 * поэтому контекст достаточно положить в обычную константу — useRef-обвязки,
 * как в React, не нужно.
 */

import { IconDescriptor } from '@soldy-ui/setup'
import { createSolidAdapterContext, useAdapter } from '../../adapter'
import type { IconProps } from './base.component'

export function setupIcon(props: IconProps) {
	const adapter = createSolidAdapterContext(IconDescriptor(), { ctrl: props.ctrl, props })

	// Выход `layout_styles` разметка кладёт в стиль корня
	return useAdapter(adapter, props)
}
