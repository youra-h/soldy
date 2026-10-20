/**
 * setupProgressLinear — setup-слой ProgressLinear.
 *
 * Создаёт adapter-context (`createSolidAdapterContext`) и связывает его с
 * Solid через useAdapter. Тело компонента Solid выполняется один раз,
 * поэтому контекст достаточно положить в обычную константу — useRef-обвязки,
 * как в React, не нужно.
 */

import { ProgressLinearDescriptor } from '@soldy-ui/setup'
import { createSolidAdapterContext, useAdapter } from '../../adapter'
import type { ProgressLinearProps } from './base.component'

export function setupProgressLinear(props: ProgressLinearProps) {
	const adapter = createSolidAdapterContext(ProgressLinearDescriptor(), {
		ctrl: props.ctrl,
		props,
	})

	// Логики здесь нет: долю, `aria-value*`, `data-indeterminate` и модификатор
	// оси считает ядро, бег рисует тема. Выход `percentStyle` разметка кладёт в
	// стиль корня
	return useAdapter(adapter, props)
}
