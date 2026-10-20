/**
 * setupPopover — setup-слой Popover.
 *
 * Создаёт adapter-context (`createSolidAdapterContext`) и связывает его с
 * Solid через useAdapter. Тело компонента Solid выполняется один раз,
 * поэтому контекст достаточно положить в обычную константу — useRef-обвязки,
 * как в React, не нужно.
 *
 * Логики здесь нет: клик по триггеру — `TPopoverPointerPlugin`, нажатие и
 * фокус мимо — `TDismissPlugin`, фокус, Escape и Tab — `TPopoverFocusPlugin`,
 * жест — `TSwipePlugin`. Разметка раскладывает то, что отдали ядро и плагины.
 */

import { PopoverDescriptor } from '@soldy-ui/setup'
import { createSolidAdapterContext, useAdapter } from '../../adapter'
import type { PopoverProps } from './base.component'

export function setupPopover(props: PopoverProps) {
	const adapter = createSolidAdapterContext(PopoverDescriptor(), { ctrl: props.ctrl, props })

	// Выход `dismiss_ownerAttribute` разметка раскладывает на панель
	return useAdapter(adapter, props)
}
