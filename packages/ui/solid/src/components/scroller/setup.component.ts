/**
 * setupScroller — setup-слой Scroller.
 *
 * Создаёт adapter-context (`createSolidAdapterContext`) и связывает его с
 * Solid через useAdapter. Тело компонента Solid выполняется один раз,
 * поэтому контекст достаточно положить в обычную константу — useRef-обвязки,
 * как в React, не нужно.
 *
 * Логики здесь нет: края ленты и её листание — `TScrollerViewportPlugin`,
 * выключенность кнопок и `tabindex` вьюпорта — ядро, имена кнопок —
 * `TScrollerNamesPlugin` по локали поддерева. Разметка раскладывает то, что
 * они отдали.
 */

import { ScrollerDescriptor } from '@soldy-ui/setup'
import { createSolidAdapterContext, useAdapter } from '../../adapter'
import type { ScrollerProps } from './base.component'

export function setupScroller(props: ScrollerProps) {
	const adapter = createSolidAdapterContext(ScrollerDescriptor(), { ctrl: props.ctrl, props })

	return useAdapter(adapter, props)
}
