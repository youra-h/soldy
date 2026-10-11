/**
 * setupProgressSpinner — setup-слой ProgressSpinner.
 *
 * Создаёт adapter-context (`createSolidAdapterContext`) и связывает его с
 * Solid через useAdapter. Тело компонента Solid выполняется один раз,
 * поэтому контекст достаточно положить в обычную константу — useRef-обвязки,
 * как в React, не нужно.
 */

import { ProgressSpinnerDescriptor } from '@soldy-ui/setup'
import { createSolidAdapterContext, useAdapter } from '../../adapter'
import type { ProgressSpinnerProps } from './base.component'

export function setupProgressSpinner(props: ProgressSpinnerProps) {
	const adapter = createSolidAdapterContext(ProgressSpinnerDescriptor(), {
		ctrl: props.ctrl,
		props,
	})

	// Логики здесь нет: долю, `aria-value*` и `data-indeterminate` считает ядро,
	// рисунок и бег — тема. Выход `fractionStyle` разметка кладёт в стиль корня
	return useAdapter(adapter, props)
}
