/**
 * setupTooltip — setup-слой Tooltip.
 *
 * Создаёт adapter-context (`createSolidAdapterContext`) и связывает его с
 * Solid через useAdapter. Тело компонента Solid выполняется один раз,
 * поэтому контекст достаточно положить в обычную константу — useRef-обвязки,
 * как в React, не нужно.
 *
 * Логики здесь нет: наведение, фокус с клавиатуры, нажатие и Escape —
 * `TTooltipTriggerPlugin`, нажатие мимо — `TDismissPlugin`. Разметка
 * раскладывает то, что отдали ядро и плагины.
 */

import { TooltipDescriptor } from '@soldy-ui/setup'
import { createSolidAdapterContext, useAdapter } from '../../adapter'
import type { TooltipProps } from './base.component'

export function setupTooltip(props: TooltipProps) {
	const adapter = createSolidAdapterContext(TooltipDescriptor(), { ctrl: props.ctrl, props })

	// Выход `dismiss_ownerAttribute` разметка раскладывает на панель
	return useAdapter(adapter, props)
}
